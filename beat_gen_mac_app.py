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

def main():
 root=tk.Tk()
 root.title('EM BEAT GEN v0.3 | EM Records')
 root.geometry('720x740')
 root.minsize(610,690)
 root.configure(bg='#10131b')
 bg='#10131b'; panel='#1b2230'; fg='#ffffff'; muted='#a5b2c7'; accent='#ff762e'
 frame=tk.Frame(root,bg=bg,padx=28,pady=20)
 frame.pack(fill='both',expand=True)
 tk.Label(frame,text='EM BEAT GEN',font=('Helvetica',29,'bold'),fg=fg,bg=bg).pack(anchor='w')
 tk.Label(frame,text='VERSION 0.3  |  EM RECORDS  |  MULTI-GENRE MIDI STUDIO',font=('Helvetica',11),fg=accent,bg=bg).pack(anchor='w',pady=(2,18))
 tk.Label(frame,text='Generate a multi-track arrangement that you can edit in FL Studio.',fg=muted,bg=bg,font=('Helvetica',12)).pack(anchor='w',pady=(0,12))
 values={}
 def add_option(label,options,initial):
  row=tk.Frame(frame,bg=bg)
  row.pack(fill='x',pady=5)
  tk.Label(row,text=label,fg=fg,bg=bg,font=('Helvetica',12),width=14,anchor='w').pack(side='left')
  v=tk.StringVar(value=initial)
  menu=tk.OptionMenu(row,v,*options)
  menu.configure(bg=panel,fg=fg,activebackground='#344154',activeforeground=fg,highlightthickness=0,font=('Helvetica',12),width=18)
  menu['menu'].configure(bg=panel,fg=fg)
  menu.pack(side='left',fill='x',expand=True)
  values[label]=v
 def add_entry(label,initial):
  row=tk.Frame(frame,bg=bg)
  row.pack(fill='x',pady=5)
  tk.Label(row,text=label,fg=fg,bg=bg,font=('Helvetica',12),width=14,anchor='w').pack(side='left')
  v=tk.StringVar(value=initial)
  tk.Entry(row,textvariable=v,fg=fg,bg=panel,insertbackground=fg,relief='flat',font=('Helvetica',13),width=20).pack(side='left',fill='x',expand=True,ipady=5)
  values[label]=v
 add_option('Genre',list(GENRES),'Afro-Reggaeton')
 add_option('Key',['Am','Cm','Dm','Em','F#m','Gm','Bm','C','D','E','F','G','A','Bb','Eb'],'Am')
 add_entry('BPM','104')
 add_entry('Bars','56')
 add_entry('Seed','42')
 add_entry('Creativity','65')
 def update_bpm(*_):
  genre=values['Genre'].get()
  if genre in GENRES:values['BPM'].set(str(GENRES[genre]))
 values['Genre'].trace_add('write',update_bpm)
 tk.Label(frame,text='Production description',fg=fg,bg=bg,font=('Helvetica',12,'bold')).pack(anchor='w',pady=(15,4))
 prompt=tk.Text(frame,height=3,fg=fg,bg=panel,insertbackground=fg,relief='flat',font=('Helvetica',12),wrap='word')
 prompt.pack(fill='x')
 prompt.insert('1.0','Commercial groove, rich bass, melodic hooks, and polished drums.')
 status=tk.StringVar(value='Ready to generate MIDI.')
 tk.Label(frame,textvariable=status,fg=muted,bg=bg,font=('Helvetica',11),anchor='w').pack(fill='x',pady=10)
 def export():
  try:
   genre=values['Genre'].get(); bpm=int(values['BPM'].get()); bars=int(values['Bars'].get()); seed=int(values['Seed'].get()); creative=int(values['Creativity'].get())
   if not 40<=bpm<=240 or not 1<=bars<=256 or not 0<=creative<=100:raise ValueError('BPM 40–240, bars 1–256 and creativity 0–100 required')
   tracks=generate(genre,bpm,bars,values['Key'].get(),seed,creative)
   out=filedialog.askdirectory(title='Choose MIDI output folder',parent=root)
   if not out:return
   folder=Path(out)/('EM_BEAT_GEN_'+str(seed));folder.mkdir(parents=True,exist_ok=True)
   (folder/'FULL_ARRANGEMENT.mid').write_bytes(midi(tracks,bpm))
   for name,notes,ch,pr in tracks:
    (folder/(name.replace('/','_')+'.mid')).write_bytes(midi([(name,notes,ch,pr)],bpm))
   status.set('Saved 10 MIDI files to '+str(folder))
   messagebox.showinfo('EM BEAT GEN','MIDI arrangement generated successfully!\\n'+str(folder),parent=root)
  except Exception as e:
   status.set('Error: '+str(e))
   messagebox.showerror('EM BEAT GEN',str(e),parent=root)
 tk.Button(frame,text='GENERATE MIDI ARRANGEMENT',command=export,fg='#10131b',bg=accent,activebackground='#ff9b61',relief='flat',font=('Helvetica',14,'bold'),pady=12).pack(fill='x',pady=(12,10))
 tk.Label(frame,text='Export: full multitrack MIDI + 9 separate instrument parts.\\nImport FULL_ARRANGEMENT.mid into FL Studio.',fg=muted,bg=bg,justify='left',font=('Helvetica',11)).pack(anchor='w')
 root.mainloop()

if __name__=='__main__':
 main()
