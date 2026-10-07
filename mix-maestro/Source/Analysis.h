#pragma once
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>
#include "DSP.h"
#include <atomic>
#include <map>
#include <mutex>
struct Summary {
 mm::Level input,output;
 std::array<float,64> spectrum{},bands{};
 double rate=48000,seconds=0,dominant=0;
 std::uint64_t fftFrames=0,dropped=0;unsigned epoch=0;
 juce::String events,name;
};
struct Frame {float l=0,r=0,ol=0,orr=0;int ch=2;double rate=48000;unsigned epoch=0;};
class Spectral {
public:
 static constexpr int size=4096;
 Spectral():fft(12){for(int i=0;i<size;++i)window[size_t(i)]=float(0.5-0.5*std::cos(2*mm::pi*i/(size-1)));}
 void reset(){pos=0;}
 void push(float l,float r,int channels,Summary& s){
  left[size_t(pos)]=l;right[size_t(pos)]=channels==2?r:l;
  if(++pos<size)return;pos=0;
  std::array<double,64> energy{};double best=0;int bestBin=0;
  for(int ch=0;ch<channels;++ch){data.fill(0);for(int i=0;i<size;++i)data[size_t(i)]=(ch==0?left:right)[size_t(i)]*window[size_t(i)];fft.performFrequencyOnlyForwardTransform(data.data(),true);
   for(int k=1;k<size/2;++k){double hz=k*s.rate/size;if(hz<20||hz>20000)continue;double power=double(data[size_t(k)])*data[size_t(k)];int band=std::clamp(int(std::log(hz/20)/std::log(1000.0)*64),0,63);energy[size_t(band)]+=power/channels;if(power>best){best=power;bestBin=k;}}
  }
  ++s.fftFrames;double total=0;for(double v:energy)total+=v;
  for(size_t i=0;i<64;++i){s.spectrum[i]=float((s.spectrum[i]*(double(s.fftFrames)-1)+energy[i])/double(s.fftFrames));s.bands[i]=total>1e-18?float(energy[i]/total):0;}
  s.dominant=bestBin*s.rate/size;
 }
private:
 juce::dsp::FFT fft;int pos=0;
 std::array<float,size> left{},right{},window{};std::array<float,size*2> data{};
};
class Analyzer:public juce::Thread {
public:
 Analyzer():Thread("Mix Maestro analysis"),fifo(capacity){startThread();}
 ~Analyzer()override{stopThread(-1);}
 void push(const Frame* data,int n){int a,b,c,d;fifo.prepareToWrite(n,a,b,c,d);for(int i=0;i<b;++i)queue[size_t(a+i)]=data[i];for(int i=0;i<d;++i)queue[size_t(c+i)]=data[b+i];fifo.finishedWrite(b+d);dropped.fetch_add(std::uint64_t(n-b-d));}
 Summary snapshot(){std::lock_guard<std::mutex> lock(mutex);return published;}
 Summary reference(){std::lock_guard<std::mutex> lock(mutex);return ref;}
 void captureReference(){std::lock_guard<std::mutex> lock(mutex);ref=published;ref.name="Captura A";}
 void requestFile(juce::File f){std::lock_guard<std::mutex> lock(mutex);file=f;loadRequested=true;status="Midiendo referencia...";}
 juce::String getStatus(){std::lock_guard<std::mutex> lock(mutex);return status;}
 void clearReference(){std::lock_guard<std::mutex> lock(mutex);ref=Summary{};status="";}
 std::atomic<bool> freeze{false};
 void setName(juce::String n){std::lock_guard<std::mutex> lock(mutex);trackName=n;}
 static std::vector<std::pair<int,Summary>> inventory(){std::lock_guard<std::mutex> lock(registryMutex());return {registry().begin(),registry().end()};}
 int identity=nextId().fetch_add(1);
private:
 static constexpr int capacity=65536;
 juce::AbstractFifo fifo;std::array<Frame,capacity> queue{};
 std::atomic<std::uint64_t> dropped{0};std::mutex mutex;
 Summary published,ref;juce::File file;bool loadRequested=false;juce::String status,trackName="Pista";
 static std::atomic<int>& nextId(){static std::atomic<int> v{1};return v;}
 static std::map<int,Summary>& registry(){static std::map<int,Summary> v;return v;}
 static std::mutex& registryMutex(){static std::mutex v;return v;}
 void analyzeFile(juce::File f){
  juce::AudioFormatManager formats;formats.registerBasicFormats();std::unique_ptr<juce::AudioFormatReader> reader(formats.createReaderFor(f));
  if(!reader||reader->numChannels<1||reader->numChannels>2||reader->sampleRate<8000){std::lock_guard<std::mutex> lock(mutex);status="Referencia no valida: usa WAV/AIFF/FLAC mono o estereo.";return;}
  Summary result;result.rate=reader->sampleRate;result.name=f.getFileName();Spectral spec;juce::AudioBuffer<float> buffer(int(reader->numChannels),4096);
  for(juce::int64 offset=0;offset<reader->lengthInSamples&&!threadShouldExit();offset+=4096){int n=int(std::min<juce::int64>(4096,reader->lengthInSamples-offset));if(!reader->read(&buffer,0,n,offset,true,true)){std::lock_guard<std::mutex> lock(mutex);status="No se pudo leer la referencia completa.";return;}
   for(int i=0;i<n;++i){float l=buffer.getSample(0,i),r=reader->numChannels==2?buffer.getSample(1,i):0;result.input.push(l,r,int(reader->numChannels));spec.push(l,r,int(reader->numChannels),result);}
  }
  result.seconds=double(result.input.frames)/result.rate;
  if(!threadShouldExit()){std::lock_guard<std::mutex> lock(mutex);ref=result;status="Referencia medida: "+result.name;}
 }
 void run()override{
  Summary current;mm::Level section;unsigned epoch=~0u;Spectral spec;int windows=0;std::uint64_t epochDropped=0;
  while(!threadShouldExit()){
   juce::File pending;{std::lock_guard<std::mutex> lock(mutex);if(loadRequested){pending=file;loadRequested=false;}}
   // File analysis uses this worker. Live queue may drop; report exposes omissions.
   if(pending.existsAsFile())analyzeFile(pending);
   int a,b,c,d;fifo.prepareToRead(8192,a,b,c,d);
   auto consume=[&](int start,int n){for(int i=0;i<n;++i){const auto& f=queue[size_t(start+i)];
    if(epoch!=f.epoch||current.rate!=f.rate){epoch=f.epoch;current=Summary{};current.rate=f.rate;current.epoch=f.epoch;section=mm::Level{};windows=0;spec.reset();epochDropped=dropped.load();}
    if(freeze.load())continue;
    current.input.push(f.l,f.r,f.ch);current.output.push(f.ol,f.orr,f.ch);section.push(f.l,f.r,f.ch);spec.push(f.l,f.r,f.ch,current);
    current.seconds=double(current.input.frames)/current.rate;
    if(section.frames>=std::uint64_t(current.rate)){++windows;if(section.nearFull>0&&windows<120){current.events+="["+juce::String(current.seconds-1,1)+"s] cerca de full scale\n";}section=mm::Level{};}
   }};
   consume(a,b);consume(c,d);fifo.finishedRead(b+d);
   if(b+d>0){current.dropped=dropped.load()-epochDropped;{std::lock_guard<std::mutex> lock(mutex);current.name=trackName;published=current;}{std::lock_guard<std::mutex> lock(registryMutex());registry()[identity]=current;}}
   wait(5);
  }
  std::lock_guard<std::mutex> lock(registryMutex());registry().erase(identity);
 }
};
