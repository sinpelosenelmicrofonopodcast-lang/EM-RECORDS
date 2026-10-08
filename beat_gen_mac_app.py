import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import random, struct, os
from pathlib import Path
GENRES={'Afro-Reggaeton':104,'Reggaeton':96,'Trap':145,'Drill':142,'Dembow':118,'Dancehall':105,'R&B':82,'Boom Bap':90,'Bachata':125,'Salsa':180,'Merengue':140,'Afrobeats':108,'Amapiano':113,'House':124,'Pop':112,'Rock':122,'Cinematic':92}
def vlq(n):
 n=max(0,int(n)); x=[n&127]; n>>=7
 while n:x.insert(0,128|(n&127));n>>=7
 return bytes(x)
def midi(tracks,bpm):
 head=b'MThd'+struct.pack('>IHHH',6,1,len(tracks)+1,480)
 tempo=round(60000000/bpm)
 def chunk(data):return b'MTrk'+struct.pack('>I',len(data))+data
 out=head+chunk(b'\x00\xff\x51\x03'+tempo.to_bytes(3,'big')+b'\x00\xff\x2f\x00')
 for name,notes,channel,program in tracks:
  events=[(0,bytes([0xc0|channel,program]))]
  for pitch,start,length,velocity in notes:
   events.append((start,bytes([0x90|channel,pitch,velocity])))
   events.append((start+length,bytes([0x80|channel,pitch,0])))
  events.sort(key=lambda e:(e[0],e[1][0]&240==144))
  body=b'';prev=0
  for t,data in events:body+=vlq(t-prev)+data;prev=t
  body+=b'\x00\xff\x2f\x00'
  out+=chunk(body)
 return out
def generate(genre,bpm,bars,key,seed,creativity):
 rng=random.Random(seed); root=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].index(key.replace('m',''))
 minor=key.endswith('m');scale=[0,2,3,5,7,8,10] if minor else [0,2,4,5,7,9,11]
 progress=[0,5,3,4] if minor else [0,4,5,3]; tracks=[]
 kinds=['Kick','Snare','Hats','Percussion','Bass','Chords','Guitar/Keys','Lead','Pads']
 for j,name in enumerate(kinds):
  notes=[]
  for bar in range(bars):
   base=bar*1920;degree=progress[(bar//2)%4];tone=scale[degree]+root
   if j==0:
    steps=[0,960] if genre in ['House','Pop'] else [0,720,1200,1680] if genre in ['Reggaeton','Afro-Reggaeton','Dembow'] else [0,960]
    for t in steps:notes.append((36,base+t,150,105))
   elif j==1:
    for t in [480,1440]:notes.append((38,base+t,135,100))
   elif j==2:
    for t in range(0,1920,240):notes.append((42,base+t,90,rng.randrange(50,82)))
   elif j==3:
    for t in [360,840,1320,1800]:
     if rng.random()<.7:notes.append((64,base+t,100,75))
   elif j==4:
    for t in [0,720,1200,1680]:
     if rng.random()<.8:notes.append((36+tone%12,base+t,300,100))
   elif j in [5,8]:
    for step in [0,2,4]:
     pitch=48+root+scale[(degree+step)%7]+12*((degree+step)//7)
     notes.append((min(108,pitch),base,1680 if j==8 else 900,65 if j==8 else 78))
   else:
    for t in ([0,480,960,1440] if j==6 else [0,360,960,1440]):
     if rng.random()<(creativity/150+.3):
      step=rng.choice([0,2,4,6])
      pitch=min(108,60+root+scale[(degree+step)%7]+12*((degree+step)//7))
      notes.append((pitch,base+t,rng.choice([180,300,420]),rng.randrange(67,105)))
  channel=9 if j<4 else j
  tracks.append((name,notes,channel,[0,0,0,0,38,4,24,80,89][j]))
 return tracks
root=tk.Tk();root.title('EM BEAT GEN | EM Records');root.geometry('600x565');root.configure(bg='#191919')
frm=ttk.Frame(root,padding=24);frm.pack(fill='both',expand=True)
ttk.Label(frm,text='EM BEAT GEN',font=('Arial',24,'bold')).pack(anchor='w')
ttk.Label(frm,text='Multi-genre MIDI composer · EM Records').pack(anchor='w',pady=(0,12))
v={}
for label,options,default in [('Genre',list(GENRES),'Afro-Reggaeton'),('Key',['Am','Cm','Dm','Em','F#m','Gm','Bm','C','D','E','F','G','A','Bb','Eb'],'Am'),('BPM',None,'104'),('Bars',None,'56'),('Seed',None,'42'),('Creativity',None,'65')]:
 row=ttk.Frame(frm);row.pack(fill='x',pady=4);ttk.Label(row,text=label,width=14).pack(side='left')
 var=tk.StringVar(value=default);v[label]=var
 item=ttk.Combobox(row,textvariable=var,values=options,state='readonly') if options else ttk.Entry(row,textvariable=var)
 item.pack(side='left',fill='x',expand=True)
def setbpm(*_):
 if v['Genre'].get() in GENRES:v['BPM'].set(str(GENRES[v['Genre'].get()]))
v['Genre'].trace_add('write',setbpm)
ttk.Label(frm,text='Description (reference for arrangement)').pack(anchor='w',pady=(8,1))
prompt=tk.Text(frm,height=3);prompt.pack(fill='x')
prompt.insert('1.0','Commercial groove, strong bass and catchy melodies')
def export():
 try:
  genre=v['Genre'].get();bpm=int(v['BPM'].get());bars=int(v['Bars'].get());seed=int(v['Seed'].get());creative=int(v['Creativity'].get())
  if not 40<=bpm<=240 or not 1<=bars<=256 or not 0<=creative<=100:raise ValueError('Invalid tempo, bars or creativity')
  tracks=generate(genre,bpm,bars,v['Key'].get(),seed,creative)
  out=filedialog.askdirectory(title='Choose MIDI output folder')
  if not out:return
  folder=Path(out)/('EM_BEAT_GEN_'+str(seed));folder.mkdir(exist_ok=True)
  (folder/'FULL_ARRANGEMENT.mid').write_bytes(midi(tracks,bpm))
  for name,notes,ch,pr in tracks:(folder/(name.replace('/','_')+'.mid')).write_bytes(midi([(name,notes,ch,pr)],bpm))
  messagebox.showinfo('EM BEAT GEN','Saved 9 instrument tracks and full arrangement in:\n'+str(folder))
 except Exception as e:messagebox.showerror('Error',str(e))
ttk.Button(frm,text='GENERATE MIDI ARRANGEMENT',command=export).pack(fill='x',pady=18)
ttk.Label(frm,text='Import FULL_ARRANGEMENT.mid in FL Studio.\nStandalone MIDI generator — no Python installation required.').pack(anchor='w')
root.mainloop()
