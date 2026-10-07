#pragma once
#include <cmath>
#include <cstdint>
#include <algorithm>
struct Meter {
 double sum=0, left=0, right=0, cross=0, dc=0;
 float peak=0;
 std::uint64_t count=0, nearFull=0;
 void reset() { *this=Meter{}; }
 void push(float l,float r,int channels) noexcept {
  peak=std::max(peak,std::abs(l)); sum+=double(l)*l; dc+=l; ++count;
  if(std::abs(l)>=0.999f) ++nearFull;
  if(channels==2) { peak=std::max(peak,std::abs(r)); sum+=double(r)*r; dc+=r; ++count;
   if(std::abs(r)>=0.999f) ++nearFull;
   left+=double(l)*l; right+=double(r)*r; cross+=double(l)*r;
  }
 }
 static float db(double amplitude) { return float(20*std::log10(std::max(amplitude,1e-12))); }
 float rmsDb() const {return db(count?std::sqrt(sum/double(count)):0);}
 float peakDb() const {return db(peak);}
 float correlation() const {return left*right>1e-24?float(cross/std::sqrt(left*right)):0;}
};
