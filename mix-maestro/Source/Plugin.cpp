#include "Analysis.h"
#include <memory>
class Processor;
class Editor:public juce::AudioProcessorEditor,private juce::Timer {
public:
 explicit Editor(Processor&);~Editor()override{stopTimer();}
 void paint(juce::Graphics&)override;void resized()override;
private:
 Processor& p;juce::LookAndFeel_V4 skin;
 std::vector<std::unique_ptr<juce::Slider>> sliders;std::vector<std::unique_ptr<juce::Label>> labels;
 std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>> attachments;
 juce::TextButton reset{"Nueva seccion"},capture{"Capturar A"},load{"Referencia WAV"},match{"Igualar RMS"},report{"Exportar informe"},neutral{"Reset DSP"};
 juce::ToggleButton bypass{"Bypass DSP"},eqOn{"EQ"},compOn{"COMP"},mono{"MONO"},freeze{"Congelar"};
 std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment>> buttons;
 juce::ComboBox role;std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> roleAttachment;
 juce::TextEditor track,notes;std::unique_ptr<juce::FileChooser> chooser;
 void timerCallback()override;void addSlider(const char*,const char*,const char* suffix="");void attachButton(juce::ToggleButton&,const char*);
 void chooseFile(bool save);juce::String recommendations(const Summary&,const Summary&);
};
class Processor:public juce::AudioProcessor {
public:
 juce::AudioProcessorValueTreeState state;Analyzer analyzer;
 std::atomic<float> reduction{0};std::atomic<unsigned> epoch{0};std::atomic<double> sampleRateValue{48000};
 static juce::AudioProcessorValueTreeState::ParameterLayout layout(){
  juce::AudioProcessorValueTreeState::ParameterLayout l;
  auto f=[&](const char* id,const char* name,float min,float max,float def,float step=0.01f){l.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{id,1},name,juce::NormalisableRange<float>(min,max,step),def));};
  auto b=[&](const char* id,const char* name){l.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{id,1},name,false));};
  f("gain","Output gain",-24,12,0);b("bypass","Bypass DSP");b("eqOn","EQ enabled");b("compOn","Compressor enabled");b("mono","Mono monitor");
  f("hpf","High pass Hz",20,300,40,1);b("hpfOn","High pass enabled");
  const float defaults[]={80,250,1000,3500,8000};
  for(int i=0;i<5;++i){juce::String prefix="eq"+juce::String(i);l.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{prefix+"f",1},prefix+" frequency",juce::NormalisableRange<float>(20,18000,1,0.3f),defaults[i]));l.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{prefix+"g",1},prefix+" gain",juce::NormalisableRange<float>(-12,12,0.1f),0));l.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID{prefix+"q",1},prefix+" Q",juce::NormalisableRange<float>(0.2f,10,0.01f),1));}
  f("threshold","Threshold dB",-48,0,-18);f("ratio","Ratio",1,12,3);f("attack","Attack ms",0.1f,100,20);f("release","Release ms",10,1000,120,1);f("knee","Knee dB",0,18,6);f("makeup","Makeup dB",-12,12,0);f("mix","Wet percent",0,100,100,1);f("sc","Detector HPF Hz",20,300,80,1);
  l.add(std::make_unique<juce::AudioParameterChoice>(juce::ParameterID{"role",1},"Track role",juce::StringArray{"Mezcla / Master","Voz","Bateria","Bajo / 808","Instrumento"},0));return l;
 }
 Processor():AudioProcessor(BusesProperties().withInput("Input",juce::AudioChannelSet::stereo(),true).withOutput("Output",juce::AudioChannelSet::stereo(),true)),state(*this,nullptr,"MixMaestro",layout()){
  int idx=0;for(auto id:{"gain","bypass","eqOn","compOn","mono","hpf","hpfOn","threshold","ratio","attack","release","knee","makeup","mix","sc"}){param[id]=state.getRawParameterValue(id);controls[size_t(idx++)]=state.getRawParameterValue(id);}
  for(int i=0;i<5;++i)for(auto suffix:{"f","g","q"}){auto id="eq"+juce::String(i)+suffix;param[id]=state.getRawParameterValue(id);eqControls[size_t(i*3+(juce::String(suffix)=="f"?0:juce::String(suffix)=="g"?1:2))]=state.getRawParameterValue(id);}
 }
 const juce::String getName()const override{return "Mix Maestro";}
 float value(const juce::String& id)const{return param.at(id)->load();}
 void set(const juce::String& id,float val){if(auto* v=state.getParameter(id)){v->beginChangeGesture();v->setValueNotifyingHost(v->convertTo0to1(val));v->endChangeGesture();}}
 void prepareToPlay(double rate,int)override{sr=rate;sampleRateValue.store(rate);++epoch;for(auto& b:equalizers)b.reset();highpass.reset();sidechain.reset();compressor.reset();outputGain.reset(rate,0.02);wet.reset(rate,0.02);outputGain.setCurrentAndTargetValue(float(mm::amp(value("gain"))));wet.setCurrentAndTargetValue(value("bypass")>0.5f?0:value("mix")/100);eqBlend.reset(rate,0.02);eqBlend.setCurrentAndTargetValue(value("eqOn"));compBlend.reset(rate,0.02);compBlend.setCurrentAndTargetValue(value("compOn"));hpBlend.reset(rate,0.02);hpBlend.setCurrentAndTargetValue(value("hpfOn"));}
 void releaseResources()override{}
 bool isBusesLayoutSupported(const BusesLayout& b)const override{auto c=b.getMainOutputChannelSet();return (c==juce::AudioChannelSet::mono()||c==juce::AudioChannelSet::stereo())&&c==b.getMainInputChannelSet();}
 void processBlock(juce::AudioBuffer<float>& buffer,juce::MidiBuffer&)override{
  juce::ScopedNoDenormals guard;int ch=buffer.getNumChannels(),n=buffer.getNumSamples();if(ch<1)return;
  for(int k=0;k<5;++k){equalizers[size_t(k)].peak(sr,eqControls[size_t(k*3)]->load(),eqControls[size_t(k*3+1)]->load(),eqControls[size_t(k*3+2)]->load());}
  highpass.highpass(sr,controls[5]->load());sidechain.highpass(sr,controls[14]->load());
  outputGain.setTargetValue(float(mm::amp(controls[0]->load())));wet.setTargetValue(controls[1]->load()>0.5f?0:controls[13]->load()/100);eqBlend.setTargetValue(controls[2]->load());compBlend.setTargetValue(controls[3]->load());hpBlend.setTargetValue(controls[6]->load());
  const float threshold=controls[7]->load(),ratio=controls[8]->load(),attack=controls[9]->load(),release=controls[10]->load(),knee=controls[11]->load(),makeup=float(mm::amp(controls[12]->load()));const bool mon=controls[4]->load()>0.5f;
  auto* l=buffer.getWritePointer(0);auto* r=ch==2?buffer.getWritePointer(1):nullptr;unsigned generation=epoch.load();float gr=0;
  std::array<Frame,512> frames{};int queued=0;
  for(int i=0;i<n;++i){float inL=l[i],inR=r?r[i]:0;float outL=inL,outR=inR,eq=eqBlend.getNextValue(),hp=hpBlend.getNextValue(),comp=compBlend.getNextValue();
   for(int c=0;c<ch;++c){float original=c==0?inL:inR;float filtered=highpass.tick(original,c);float x=original+hp*(filtered-original);float shaped=x;for(auto& b:equalizers)shaped=b.tick(shaped,c);x+=eq*(shaped-x);if(c==0)outL=x;else outR=x;}
   double detector=std::abs(double(sidechain.tick(outL,0)));if(r)detector=std::max(detector,std::abs(double(sidechain.tick(outR,1))));float cg=compressor.tick(detector,sr,threshold,ratio,attack,release,knee);gr=std::max(gr,float(compressor.reduction)*comp);
   float gain=1+comp*(cg*makeup-1);outL*=gain;outR*=gain;float w=wet.getNextValue(),g=outputGain.getNextValue();outL=inL+w*(outL*g-inL);outR=inR+w*(outR*g-inR);if(mon&&r){float m=(outL+outR)*0.5f;outL=m;outR=m;}l[i]=outL;if(r)r[i]=outR;
   frames[size_t(queued++)]={inL,inR,outL,outR,ch,sr,generation};if(queued==512){analyzer.push(frames.data(),queued);queued=0;}
  }
  if(queued>0)analyzer.push(frames.data(),queued);reduction.store(gr);
 }
 juce::AudioProcessorEditor* createEditor()override{return new Editor(*this);}bool hasEditor()const override{return true;}
 bool acceptsMidi()const override{return false;}bool producesMidi()const override{return false;}double getTailLengthSeconds()const override{return 0;}
 int getNumPrograms()override{return 1;}int getCurrentProgram()override{return 0;}void setCurrentProgram(int)override{}const juce::String getProgramName(int)override{return {}; }void changeProgramName(int,const juce::String&)override{}
 void getStateInformation(juce::MemoryBlock& out)override{auto xml=state.copyState().createXml();copyXmlToBinary(*xml,out);}void setStateInformation(const void* data,int size)override{auto xml=getXmlFromBinary(data,size);if(xml&&xml->hasTagName(state.state.getType()))state.replaceState(juce::ValueTree::fromXml(*xml));}
 void resetDSP(){set("gain",0);set("eqOn",0);set("compOn",0);set("hpfOn",0);set("mono",0);set("makeup",0);set("mix",100);for(int k=0;k<5;++k)set("eq"+juce::String(k)+"g",0);}
private:
 std::map<juce::String,std::atomic<float>*> param;
 std::array<std::atomic<float>*,15> controls{};std::array<std::atomic<float>*,15> eqControls{};
 double sr=48000;std::array<mm::Biquad,5> equalizers;mm::Biquad highpass,sidechain;mm::Compressor compressor;
 juce::SmoothedValue<float> outputGain,wet,eqBlend,compBlend,hpBlend;
};
void Editor::addSlider(const char* id,const char* title,const char* suffix){auto s=std::make_unique<juce::Slider>();s->setSliderStyle(juce::Slider::LinearHorizontal);s->setTextBoxStyle(juce::Slider::TextBoxRight,false,72,22);s->setTextValueSuffix(suffix);s->setLookAndFeel(&skin);addAndMakeVisible(*s);auto l=std::make_unique<juce::Label>();l->setText(title,juce::dontSendNotification);l->setColour(juce::Label::textColourId,juce::Colour(0xffacb9cc));addAndMakeVisible(*l);attachments.push_back(std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(p.state,id,*s));sliders.push_back(std::move(s));labels.push_back(std::move(l));}
void Editor::attachButton(juce::ToggleButton& b,const char* id){addAndMakeVisible(b);b.setLookAndFeel(&skin);buttons.push_back(std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(p.state,id,b));}
Editor::Editor(Processor& proc):AudioProcessorEditor(proc),p(proc){
 setResizable(false,false);
 skin.setColour(juce::Slider::thumbColourId,juce::Colour(0xff48e0b7));skin.setColour(juce::Slider::trackColourId,juce::Colour(0xff48e0b7));skin.setColour(juce::TextButton::buttonColourId,juce::Colour(0xff29384c));
 for(auto* b:{&reset,&capture,&load,&match,&report,&neutral}){b->setLookAndFeel(&skin);addAndMakeVisible(*b);}
 attachButton(bypass,"bypass");attachButton(eqOn,"eqOn");attachButton(compOn,"compOn");attachButton(mono,"mono");addAndMakeVisible(freeze);freeze.setLookAndFeel(&skin);
 reset.onClick=[this]{++p.epoch;};capture.onClick=[this]{p.analyzer.captureReference();};load.onClick=[this]{chooseFile(false);};report.onClick=[this]{chooseFile(true);};neutral.onClick=[this]{p.resetDSP();};freeze.onClick=[this]{p.analyzer.freeze.store(freeze.getToggleState());};
 match.onClick=[this]{auto s=p.analyzer.snapshot(),r=p.analyzer.reference();if(s.output.frames>0&&r.input.frames>0&&s.output.rms()>1e-8&&r.input.rms()>1e-8){float delta=float(mm::db(r.input.rms())-mm::db(s.output.rms()));float requested=p.value("gain")+std::clamp(delta,-12.f,12.f);double safe=s.output.peak>0?-1-mm::db(s.output.peak)+p.value("gain"):requested;p.set("gain",std::clamp(std::min(requested,float(safe)),-24.f,12.f));}};
 role.addItemList(juce::StringArray{"Mezcla / Master","Voz","Bateria","Bajo / 808","Instrumento"},1);addAndMakeVisible(role);roleAttachment=std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(p.state,"role",role);
 track.setText(p.state.state.getProperty("trackName","Pista "+juce::String(p.analyzer.identity)).toString());track.onTextChange=[this]{p.analyzer.setName(track.getText());p.state.state.setProperty("trackName",track.getText(),nullptr);};addAndMakeVisible(track);p.analyzer.setName(track.getText());
 notes.setMultiLine(true);notes.setReadOnly(true);notes.setColour(juce::TextEditor::backgroundColourId,juce::Colour(0xff182230));notes.setColour(juce::TextEditor::textColourId,juce::Colour(0xffd7e2ef));addAndMakeVisible(notes);
 const char* names[]={"SUB","CUERPO","MEDIOS","PRESENCIA","AIRE"};for(int i=0;i<5;++i){auto id="eq"+juce::String(i);addSlider((id+"f").toRawUTF8(),names[i]," Hz");addSlider((id+"g").toRawUTF8(),"Ganancia"," dB");addSlider((id+"q").toRawUTF8(),"Q");}
 addSlider("threshold","Threshold"," dB");addSlider("ratio","Ratio",":1");addSlider("attack","Attack"," ms");addSlider("release","Release"," ms");addSlider("knee","Knee"," dB");addSlider("makeup","Makeup"," dB");addSlider("sc","HPF detector"," Hz");addSlider("gain","Salida"," dB");addSlider("mix","Wet"," %");
 notes.setText("Reproduce una seccion para medir. EQ y COMP empiezan apagados. Carga una referencia o captura A para comparar.",false);setSize(1120,860);startTimerHz(8);
}
void Editor::resized(){
 track.setBounds(700,24,200,28);role.setBounds(920,24,180,28);reset.setBounds(20,67,135,28);capture.setBounds(165,67,115,28);load.setBounds(290,67,145,28);match.setBounds(445,67,125,28);report.setBounds(580,67,160,28);freeze.setBounds(755,67,115,28);mono.setBounds(880,67,90,28);bypass.setBounds(980,67,130,28);
 notes.setBounds(650,170,450,230);eqOn.setBounds(20,417,80,28);compOn.setBounds(785,417,100,28);neutral.setBounds(945,417,155,28);
 for(int i=0;i<15;++i){int band=i/3,row=i%3,x=20+band*151,y=465+row*73;labels[size_t(i)]->setBounds(x,y,143,20);sliders[size_t(i)]->setBounds(x,y+21,143,33);}
 for(int i=15;i<24;++i){int j=i-15,x=j<7?785:20,y=j<7?460+j*42:708+(j-7)*55;int width=j<7?315:735;labels[size_t(i)]->setBounds(x,y,width,17);sliders[size_t(i)]->setBounds(x,y+16,width,26);}
}
juce::String Editor::recommendations(const Summary& s,const Summary& r){
 juce::String text="INGENIERO LOCAL - datos medidos / candidatos\n";
 if(s.input.frames==0||s.input.rms()<1e-8)return text+"Reproduce la seccion. Selecciona el tipo de pista y conserva el mismo pasaje para A/B.";
 if(s.input.nearFull>0)text+="1. Entrada: "+juce::String(juce::int64(s.input.nearFull))+" muestras cerca de full scale. Revisa fuente y picos; bajar salida no repara clipping previo.\n";
 if(s.output.peak>1)text+="Salida supera 0 dBFS. Baja ganancia/makeup antes de exportar.\n";
 if(s.input.channels==2&&s.input.correlation()<0)text+="Estereo: correlacion negativa. Comprueba MONO; no implica un error por si sola.\n";
 if(s.input.dc()>0.01)text+="DC medido >1%: revisa fuente y desplazamiento antes de filtrar.\n";
 if(p.reduction.load()>6)text+="COMP: GR actual >6 dB. Comprueba transientes y recuperacion; reduce ratio o sube threshold si pierde vida.\n";
 double total=0;for(float v:s.spectrum)total+=v;
 if(total>1e-18){double low=0,bright=0;for(int i=0;i<64;++i){double hz=20*std::pow(1000.0,(i+0.5)/64);if(hz<80)low+=s.spectrum[size_t(i)];if(hz>5000&&hz<10000)bright+=s.spectrum[size_t(i)];}
  if(low/total>0.4)text+="CANDIDATO: mas del 40% de energia espectral esta bajo 80 Hz. Escucha si es bajo util o exceso; evita recortar por costumbre.\n";
  if(bright/total>0.25)text+="CANDIDATO: mucha energia 5-10 kHz. Comprueba aspereza/sibilancia en contexto; puede ser percusion legitima.\n";
 }
 if(s.dominant>0)text+="Pico del ultimo bloque FFT: "+juce::String(s.dominant,0)+" Hz. Puede ser una nota legitima; no es una resonancia confirmada.\n";
 if(role.getSelectedId()==2)text+="Voz: confirma articulacion y sibilancia en contexto. EQ estatica solo para exceso persistente.\n";
 if(role.getSelectedId()==3&&p.value("attack")<5&&p.value("compOn")>0.5f)text+="Bateria: attack <5 ms; comprueba si recorta el golpe que quieres conservar.\n";
 if(role.getSelectedId()==4)text+="Bajo/808: comprueba duracion y balance con kick antes de recortar graves.\n";
 if(r.input.frames>0)text+="Referencia "+r.name+": diferencia RMS entrada "+juce::String(mm::db(s.input.rms())-mm::db(r.input.rms()),1)+" dB. Igualar RMS es aproximado; compara secciones equivalentes.\n";
 if(s.dropped>0)text+="Analisis omitio "+juce::String(juce::int64(s.dropped))+" muestras por carga; reinicia seccion al terminar la referencia.\n";
 int others=0;for(const auto& item:Analyzer::inventory())if(item.first!=p.analyzer.identity&&item.second.input.frames>0)++others;
 if(others>0)text+="Sesion: "+juce::String(others)+" otras instancias medidas en este proceso. Informe incluye inventario; no prueba masking ni alineacion.\n";
 text+="Punto inicial COMP: ratio 3:1, attack 20 ms, release 120 ms; ajusta threshold para 2-4 dB GR si necesitas nivelar.\nNo se aplica EQ automaticamente. Comprueba bypass al mismo volumen.";return text;
}
void Editor::timerCallback(){auto s=p.analyzer.snapshot(),r=p.analyzer.reference();notes.setText(recommendations(s,r),false);repaint();}
void Editor::paint(juce::Graphics& g){
 g.fillAll(juce::Colour(0xff101721));g.setColour(juce::Colour(0xff48e0b7));g.setFont(28.f);g.drawText("MIX MAESTRO",20,17,360,40,juce::Justification::centredLeft);g.setColour(juce::Colour(0xff8296ad));g.setFont(13.f);g.drawText("0.2  /  ANALYZE | SHAPE | COMPARE",335,22,350,30,juce::Justification::centredLeft);
 auto s=p.analyzer.snapshot(),ref=p.analyzer.reference();g.setColour(juce::Colours::white);g.setFont(15.f);
 juce::String metrics="IN "+juce::String(mm::db(s.input.peak),1)+" dBFS  |  OUT "+juce::String(mm::db(s.output.peak),1)+" dBFS  |  RMS "+juce::String(mm::db(s.input.rms()),1)+" dBFS  |  CREST "+juce::String(mm::db(s.input.peak)-mm::db(s.input.rms()),1)+" dB  |  GR "+juce::String(p.reduction.load(),1)+" dB";
 g.drawText(metrics,20,110,1080,25,juce::Justification::centredLeft);g.setFont(13.f);g.drawText("Seccion "+juce::String(s.seconds,1)+"s   L/R "+juce::String(s.input.correlation(),2)+"   Mono "+juce::String(s.input.monoDelta(),1)+" dB   FFT 4096 / energia relativa",20,140,1000,25,juce::Justification::centredLeft);
 juce::Rectangle<float> plot(20,180,610,220);g.setColour(juce::Colour(0xff182230));g.fillRoundedRectangle(plot,8);g.setColour(juce::Colour(0xff304154));for(int i=0;i<5;++i)g.drawHorizontalLine(int(plot.getY()+i*plot.getHeight()/4),plot.getX(),plot.getRight());
 auto draw=[&](const Summary& data,juce::Colour color){if(data.fftFrames==0||data.input.rms()<1e-8)return;double max=1e-18;for(float v:data.spectrum)max=std::max(max,double(v));juce::Path path;for(int i=0;i<64;++i){double relative=10*std::log10(std::max(double(data.spectrum[size_t(i)]),1e-18)/max);float x=plot.getX()+i*plot.getWidth()/63,y=plot.getBottom()-float(std::clamp((relative+60)/60,0.0,1.0))*plot.getHeight();if(i==0)path.startNewSubPath(x,y);else path.lineTo(x,y);}g.setColour(color);g.strokePath(path,juce::PathStrokeType(2));};draw(s,juce::Colour(0xff48e0b7));if(ref.fftFrames>0)draw(ref,juce::Colour(0xffffac5c));
 g.setColour(juce::Colour(0xff8296ad));g.drawText("20 Hz                         200 Hz                         2 kHz                         20 kHz",20,397,610,20,juce::Justification::centredLeft);
 g.drawText("5 BANDAS PARAMETRICAS / procesan solo con EQ activado",110,417,650,28,juce::Justification::centredLeft);g.drawText("Sin limitador / LUFS y true peak no disponibles / referencia medida, sin reproduccion",20,820,1080,24,juce::Justification::centredLeft);
 g.drawText(p.analyzer.getStatus(),20,842,1080,16,juce::Justification::centredLeft);
}
void Editor::chooseFile(bool save){
 chooser=std::make_unique<juce::FileChooser>(save?"Guardar informe":"Seleccionar referencia",juce::File{},save?"*.txt":"*.wav;*.aiff;*.aif;*.flac;*.mp3");auto safe=juce::Component::SafePointer<Editor>(this);
 chooser->launchAsync(save?(juce::FileBrowserComponent::saveMode|juce::FileBrowserComponent::canSelectFiles|juce::FileBrowserComponent::warnAboutOverwriting):(juce::FileBrowserComponent::openMode|juce::FileBrowserComponent::canSelectFiles),[safe,save](const juce::FileChooser& c){if(!safe)return;auto file=c.getResult();if(file==juce::File{})return;
  if(!save){safe->p.analyzer.requestFile(file);return;}
  auto s=safe->p.analyzer.snapshot(),r=safe->p.analyzer.reference();juce::String text="Mix Maestro 0.2 / "+juce::Time::getCurrentTime().toISO8601(true)+"\nPista: "+safe->track.getText()+"\nRol: "+safe->role.getText()+"\nMedido; no se afirma escucha perceptual\nSeccion: "+juce::String(s.seconds,2)+" s; SR "+juce::String(s.rate,0)+" Hz\nIN peak "+juce::String(mm::db(s.input.peak),2)+" dBFS; RMS "+juce::String(mm::db(s.input.rms()),2)+" dBFS\nOUT peak "+juce::String(mm::db(s.output.peak),2)+" dBFS; RMS "+juce::String(mm::db(s.output.rms()),2)+" dBFS\n"+safe->recommendations(s,r)+"\n\nEventos por segundo (tiempo de audio medido, no timeline DAW):\n"+s.events+"\nParametros:\n"+safe->p.state.copyState().toXmlString()+"\nOtras instancias en el mismo proceso:\n";
  for(const auto& item:Analyzer::inventory())text+=item.second.name+" / RMS "+juce::String(mm::db(item.second.input.rms()),2)+" dBFS / "+juce::String(item.second.seconds,1)+"s\n";
  if(!file.withFileExtension("txt").replaceWithText(text))safe->notes.setText("No se pudo guardar el informe.",false);
 });
}
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter(){return new Processor;}
