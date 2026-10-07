#include "../Source/Meter.h"
#include <cassert>
#include <iostream>
int main(){
 Meter m;for(int i=0;i<48000;++i){float v=float(0.5*std::sin(2*3.141592653589793*1000*i/48000));m.push(v,v,2);}
 assert(std::abs(m.peakDb()+6.0206f)<0.01f);assert(std::abs(m.rmsDb()+9.0309f)<0.01f);assert(std::abs(m.correlation()-1)<0.001f);assert(m.nearFull==0);
 m.reset();for(int i=0;i<100;++i)m.push(0.5f,-0.5f,2);assert(std::abs(m.correlation()+1)<0.001f);
 m.reset();m.push(1,1,2);assert(m.nearFull==2);m.reset();m.push(0,0,2);assert(std::isfinite(m.rmsDb()));assert(m.correlation()==0);
 std::cout<<"PASS: sine peak/RMS, stereo/anti-phase, full scale, reset, silence\n";
}
