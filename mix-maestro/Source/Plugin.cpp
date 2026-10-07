#include <juce_audio_utils/juce_audio_utils.h>
#include <atomic>
#include "Meter.h"
class Processor;
class Editor : public juce::AudioProcessorEditor, private juce::Timer {
public:
 explicit Editor(Processor&);
 void paint(juce::Graphics&) override;
 void resized() override;
private:
 void timerCallback() override {repaint();}
 Processor& proc;
 juce::Slider gain;
 juce::TextButton reset{"Nueva medicion"};
 juce::ToggleButton bypass{"Bypass de ganancia"};
 std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> gainAttachment;
 std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> bypassAttachment;
};
class Processor : public juce::AudioProcessor {
public:
 juce::AudioProcessorValueTreeState state;
 std::atomic<float> peak{-120},rms{-120},corr{0},seconds{0};
 std::atomic<bool> resetRequested{false};
 std::atomic<std::uint64_t> nearFull{0};
 std::atomic<int> channelCount{2};
 Processor():AudioProcessor(BusesProperties().withInput("Input",juce::AudioChannelSet::stereo(),true).withOutput("Output",juce::AudioChannelSet::stereo(),true)),
 state(*this,nullptr,"MixMaestro",{std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{"gain",1},"Output gain (dB)",juce::NormalisableRange<float>(-24,12,0.1f),0),std::make_unique<juce::AudioParameterBool>(juce::ParameterID{"bypass",1},"Bypass gain",false)}) {
 gainParam=state.getRawParameterValue("gain"); bypassParam=state.getRawParameterValue("bypass");
 }
 const juce::String getName() const override {return "Mix Maestro";}
 void prepareToPlay(double rate,int) override {sr=rate; meter.reset(); frames=0; smooth.reset(rate,0.02);smooth.setCurrentAndTargetValue(juce::Decibels::decibelsToGain(gainParam->load()));}
 void releaseResources() override {}
 bool isBusesLayoutSupported(const BusesLayout& b) const override {auto c=b.getMainOutputChannelSet();return (c==juce::AudioChannelSet::mono()||c==juce::AudioChannelSet::stereo())&&c==b.getMainInputChannelSet();}
 void processBlock(juce::AudioBuffer<float>& buffer,juce::MidiBuffer&) override {
  juce::ScopedNoDenormals guard;
  if(resetRequested.exchange(false)) {meter.reset();frames=0;}
  int ch=buffer.getNumChannels(), n=buffer.getNumSamples();
  if(ch<1) return;
  auto* l=buffer.getWritePointer(0);auto* r=ch>1?buffer.getWritePointer(1):nullptr;
  smooth.setTargetValue(bypassParam->load()>0.5f?1.f:juce::Decibels::decibelsToGain(gainParam->load()));
  for(int i=0;i<n;++i){meter.push(l[i],r?r[i]:0,ch);float g=smooth.getNextValue();l[i]*=g;if(r)r[i]*=g;}
  frames+=std::uint64_t(n);peak.store(meter.peakDb());rms.store(meter.rmsDb());corr.store(meter.correlation());seconds.store(float(double(frames)/sr));nearFull.store(meter.nearFull);channelCount.store(ch);
 }
 juce::AudioProcessorEditor* createEditor() override {return new Editor(*this);}
 bool hasEditor() const override {return true;}
 bool acceptsMidi() const override {return false;} bool producesMidi() const override {return false;}
 double getTailLengthSeconds() const override {return 0;}
 int getNumPrograms() override {return 1;} int getCurrentProgram() override {return 0;}
 void setCurrentProgram(int) override {} const juce::String getProgramName(int) override {return {};}
 void changeProgramName(int,const juce::String&) override {}
 void getStateInformation(juce::MemoryBlock& out) override {auto xml=state.copyState().createXml();copyXmlToBinary(*xml,out);}
 void setStateInformation(const void* data,int size) override {auto xml=getXmlFromBinary(data,size);if(xml&&xml->hasTagName(state.state.getType()))state.replaceState(juce::ValueTree::fromXml(*xml));}
private:
 Meter meter; double sr=48000;std::uint64_t frames=0;
 std::atomic<float>* gainParam=nullptr;std::atomic<float>* bypassParam=nullptr;
 juce::SmoothedValue<float> smooth;
};
Editor::Editor(Processor& p):AudioProcessorEditor(p),proc(p){
 setSize(720,460);gain.setSliderStyle(juce::Slider::LinearHorizontal);gain.setTextBoxStyle(juce::Slider::TextBoxRight,false,80,24);gain.setTextValueSuffix(" dB");
 addAndMakeVisible(gain);addAndMakeVisible(reset);addAndMakeVisible(bypass);
 gainAttachment=std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,"gain",gain);
 bypassAttachment=std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(p.state,"bypass",bypass);
 reset.onClick=[this]{proc.resetRequested.store(true);};startTimerHz(10);
}
void Editor::resized(){gain.setBounds(180,365,490,40);reset.setBounds(35,410,180,28);bypass.setBounds(430,410,250,28);}
void Editor::paint(juce::Graphics& g){
 g.fillAll(juce::Colour(0xff141b24));g.setColour(juce::Colour(0xff42dfb5));g.setFont(30.f);g.drawText("MIX MAESTRO",30,20,660,45,juce::Justification::centredLeft);
 g.setColour(juce::Colours::white);g.setFont(16.f);
 g.drawText("0.1 / Analizador local / Medicion de entrada acumulada",30,70,660,30,juce::Justification::centredLeft);
 float s=proc.seconds.load(),pk=proc.peak.load(),rm=proc.rms.load(),cr=proc.corr.load();
 juce::String msg="Duracion: "+juce::String(s,1)+" s\nSample peak: "+juce::String(pk,1)+" dBFS    RMS: "+juce::String(rm,1)+" dBFS\nCrest factor: "+juce::String(pk-rm,1)+" dB\n";
 msg+=proc.channelCount.load()==2?"Correlacion L/R: "+juce::String(cr,2)+"\n":"Canal mono: correlacion no aplicable\n";
 msg+="Muestras >= 0.999: "+juce::String(juce::int64(proc.nearFull.load()))+"\n\n";
 if(s<1||rm<-100)msg+="Reproduce audio para iniciar el analisis.";
 else {
  if(proc.nearFull.load()>0)msg+="MEDIDO: muestras cerca de full scale. Revisa clipping en la fuente.\n";
  else if(pk>-1)msg+="MEDIDO: menos de 1 dB de margen de sample peak.\n";
  else msg+="MEDIDO: hay margen de sample peak; no requiere correccion por si solo.\n";
  if(proc.channelCount.load()==2&&cr<0)msg+="CANDIDATO: correlacion negativa. Compara en mono; no prueba un error.\n";
  msg+="Estos valores no diagnostican EQ, sibilancia ni calidad musical.";
 }
 g.drawMultiLineText(msg,30,130,660,22.f);g.drawText("Ganancia de salida",30,365,150,40,juce::Justification::centredLeft);
}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new Processor;}
