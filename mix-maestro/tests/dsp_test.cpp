#include "../Source/DSP.h"
#include <stdexcept>
#include <iostream>
#include <cstdint>
void check(bool v){if(!v)throw std::runtime_error("DSP check failed");}
int main(){
 mm::Level m;for(int i=0;i<48000;++i){float v=float(0.5*std::sin(2*mm::pi*1000*i/48000));m.push(v,v,2);}check(std::abs(mm::db(m.rms())+9.0309)<0.01);check(std::abs(m.correlation()-1)<0.0001);check(std::abs(m.monoDelta())<0.001);
 mm::Level anti;for(int i=0;i<1000;++i){float x=float(std::sin(i));anti.push(x,-x,2);}check(std::abs(anti.correlation()+1)<0.001);check(anti.monoDelta()<-100);
 mm::Biquad eq;eq.peak(48000,1000,-6,1);mm::Level o;for(int i=0;i<96000;++i){float v=float(0.5*std::sin(2*mm::pi*1000*i/48000));float y=eq.tick(v,0);if(i>48000)o.push(y,0,1);}check(std::abs(mm::db(o.rms())+15.0309)<0.03);
 mm::Biquad hp;hp.highpass(48000,100);float y=0;for(int i=0;i<48000;++i)y=hp.tick(1,0);check(std::abs(y)<1e-6);
 mm::Compressor c;for(int i=0;i<480000;++i)c.tick(mm::amp(-6),48000,-18,4,10,100,0);check(std::abs(c.reduction-9)<0.01);for(int i=0;i<480000;++i)c.tick(0,48000,-18,4,10,100,0);check(c.reduction<0.001);
 check(mm::Compressor::target(-18,-18,4,6)>0);std::cout<<"PASS: RMS, centered correlation, mono fold, EQ gain, HPF DC rejection, compression steady-state/release/knee\n";
}
