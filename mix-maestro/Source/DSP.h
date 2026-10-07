#pragma once
#include <array>
#include <cstdint>
#include <cmath>
#include <algorithm>
namespace mm {
constexpr double pi=3.14159265358979323846;
inline double db(double v){return 20.0*std::log10(std::max(v,1e-12));}
inline double amp(double v){return std::pow(10.0,v/20.0);}
struct Biquad {
 double b0=1,b1=0,b2=0,a1=0,a2=0;
 std::array<double,2> z1{},z2{};
 void reset(){z1.fill(0);z2.fill(0);}
 void peak(double sr,double hz,double gain,double q){
  double w=2*pi*std::clamp(hz,10.0,sr*0.45)/sr,c=std::cos(w),al=std::sin(w)/(2*q),A=std::pow(10.0,gain/40.0),den=1+al/A;
  b0=(1+al*A)/den;b1=-2*c/den;b2=(1-al*A)/den;a1=-2*c/den;a2=(1-al/A)/den;
 }
 void highpass(double sr,double hz){
  double w=2*pi*std::clamp(hz,10.0,sr*0.45)/sr,c=std::cos(w),al=std::sin(w)/std::sqrt(2.0),den=1+al;
  b0=(1+c)/(2*den);b1=-(1+c)/den;b2=b0;a1=-2*c/den;a2=(1-al)/den;
 }
 float tick(float x,int ch){double y=b0*x+z1[size_t(ch)];z1[size_t(ch)]=b1*x-a1*y+z2[size_t(ch)];z2[size_t(ch)]=b2*x-a2*y;return float(y);}
};
struct Compressor {
 double reduction=0;
 void reset(){reduction=0;}
 static double target(double inputDb,double threshold,double ratio,double knee){
  double x=inputDb-threshold, slope=1-1/ratio;
  if(knee>0&&x>-knee/2&&x<knee/2)return slope*(x+knee/2)*(x+knee/2)/(2*knee);
  return x>=knee/2?slope*x:0;
 }
 float tick(double detector,double sr,double threshold,double ratio,double attackMs,double releaseMs,double knee){
  double wanted=target(db(detector),threshold,ratio,knee),ms=wanted>reduction?attackMs:releaseMs;
  double c=std::exp(-1/(sr*std::max(ms,0.1)*0.001));reduction=c*reduction+(1-c)*wanted;return float(amp(-reduction));
 }
};
struct Level {
 double sum=0,l2=0,r2=0,lr=0,l=0,r=0,mid2=0;
 double peak=0;std::uint64_t frames=0,nearFull=0;int channels=2;
 void push(float a,float b,int ch){channels=ch;++frames;sum+=double(a)*a;peak=std::max(peak,std::abs(double(a)));l+=a;l2+=double(a)*a;if(std::abs(a)>=0.999f)++nearFull;
  if(ch==2){sum+=double(b)*b;peak=std::max(peak,std::abs(double(b)));r+=b;r2+=double(b)*b;lr+=double(a)*b;if(std::abs(b)>=0.999f)++nearFull;}
  double m=ch==2?(double(a)+b)/2:a;mid2+=m*m;
 }
 double rms()const{return frames?std::sqrt(sum/(double(frames)*channels)):0;}
 double correlation()const{if(channels!=2||frames==0)return 0;double n=double(frames),cov=lr-l*r/n,vl=l2-l*l/n,vr=r2-r*r/n;return vl*vr>1e-24?std::clamp(cov/std::sqrt(vl*vr),-1.0,1.0):0;}
 double monoDelta()const{return frames?db(std::sqrt(mid2/double(frames)))-db(rms()):0;}
 double dc()const{return frames?std::max(std::abs(l/double(frames)),channels==2?std::abs(r/double(frames)):0):0;}
};
}
