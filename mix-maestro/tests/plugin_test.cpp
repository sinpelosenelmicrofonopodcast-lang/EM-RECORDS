#include "../Source/Plugin.cpp"
#include <iostream>
#include <stdexcept>
void require(bool ok,const char* msg){if(!ok)throw std::runtime_error(msg);}
int main(){
 juce::ScopedJuceInitialiser_GUI gui;Processor p;juce::MidiBuffer midi;juce::AudioBuffer<float> b(2,512);p.prepareToPlay(48000,512);
 for(int pass=0;pass<24;++pass){for(int i=0;i<512;++i){float v=float(0.2*std::sin(2*mm::pi*1000*(i+pass*512)/48000));b.setSample(0,i,v);b.setSample(1,i,v);}float original=b.getSample(0,99);p.processBlock(b,midi);require(std::abs(b.getSample(0,99)-original)<1e-7,"neutral changed audio");juce::Thread::sleep(3);}
 juce::Thread::sleep(100);auto s=p.analyzer.snapshot();require(s.input.frames>=12000,"analysis missing frames");require(s.fftFrames>0,"FFT missing");require(std::abs(mm::db(s.input.rms())+16.9897)<0.04,"RMS mismatch");
 p.set("eqOn",1);p.set("eq2f",1000);p.set("eq2g",-6);p.set("gain",-3);for(int pass=0;pass<80;++pass){for(int i=0;i<512;++i){float v=float(0.2*std::sin(2*mm::pi*1000*(i+pass*512)/48000));b.setSample(0,i,v);b.setSample(1,i,v);}p.processBlock(b,midi);require(std::isfinite(b.getSample(0,200)),"nonfinite processing");}
 juce::MemoryBlock saved;p.getStateInformation(saved);Processor restored;restored.setStateInformation(saved.getData(),int(saved.getSize()));require(std::abs(restored.value("gain")+3)<0.01,"gain recall");require(std::abs(restored.value("eq2g")+6)<0.01,"EQ recall");require(restored.value("eqOn")>0.5,"EQ enable recall");
 p.set("bypass",1);for(int pass=0;pass<12;++pass){b.clear();b.setSample(0,200,0.4f);b.setSample(1,200,-0.2f);p.processBlock(b,midi);}require(std::abs(b.getSample(0,200)-0.4)<1e-6,"bypass failed");
 p.set("mono",1);b.clear();b.setSample(0,200,0.4f);b.setSample(1,200,-0.2f);p.processBlock(b,midi);require(std::abs(b.getSample(0,200)-0.1)<1e-5&&std::abs(b.getSample(1,200)-0.1)<1e-5,"mono failed");
 ++p.epoch;b.clear();p.processBlock(b,midi);juce::Thread::sleep(100);s=p.analyzer.snapshot();require(s.input.frames==512,"section reset failed");
 std::unique_ptr<juce::AudioProcessorEditor> editor(p.createEditor());require(editor->getWidth()==1120&&editor->getHeight()==860,"GUI failed");auto image=editor->createComponentSnapshot(editor->getLocalBounds());juce::File preview=juce::File::getCurrentWorkingDirectory().getChildFile("dist/Mix_Maestro_0.2_Preview.png");preview.getParentDirectory().createDirectory();if(auto stream=preview.createOutputStream()){juce::PNGImageFormat png;require(png.writeImageToStream(image,*stream),"GUI render failed");}editor.reset();
 std::cout<<"PASS: neutral signal, async analysis/FFT, finite EQ, state recall, full bypass, mono fold, section reset, GUI construction\n";
}
