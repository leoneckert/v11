let newOscButton = document.querySelector("#newOsc");
let newNoiseButton = document.querySelector("#newNoise");
let newFMSynthButton = document.querySelector("#newFMSynth");

let newMembraneSynthButton = document.querySelector("#newMembraneSynth");
let newPluckSynthButton = document.querySelector("#newPluckSynth");



let closeAllButton = document.querySelector("#closeAll");
let bringToFrontButton = document.querySelector("#bringToFront");


let windowList = document.querySelector("#windowlist");
let playButton = document.querySelector("#play");
let stopButton = document.querySelector("#stop");


let screenSize = {w:window.screen.width, h:window.screen.height};
console.log(screenSize)
let screenBoundaries = {left: 100, right: 100, top: 200, bottom: 200}; // in percentage, all left of this is 0 and right is 100% x pos of window
let windows = [];

let audioReady = false;
async function readyTone(){
  if(audioReady) return
	await Tone.start()
  audioReady = true;
}
function bringAllWindowsToFront(){
  windows.forEach(w=>{
    console.log("focusing", w)
    w.win.focus();
  })
}
function newThing(type){
  readyTone();
  bringAllWindowsToFront();
  let win = new Thing(inWords(windows.length+1), type, windowList, windows, bringAllWindowsToFront.bind(this));
  windows.push( win );
}

newOscButton.addEventListener("click", function(){
  newThing("osc");
});
newNoiseButton.addEventListener("click", function(){
  newThing("noise");
});
newFMSynthButton.addEventListener("click", function(){
  newThing("fmSynth");
});
newMembraneSynthButton.addEventListener("click", function(){
  newThing("membraneSynth");
});

newPluckSynthButton.addEventListener("click", function(){
  newThing("pluckSynth");
});


bringToFrontButton.addEventListener("click", bringAllWindowsToFront);
closeAllButton.addEventListener("click", closingCode)

window.onbeforeunload = closingCode;
function closingCode(){
   console.log(windows)
   for(let i = windows.length-1; i>=0; i--){
    windows[i].selfDestroy(); 
   }
}




class Thing{
  constructor(name, type, parentDOMelm, parentArray){
    this.parentDOMelm = parentDOMelm;
    this.parentArray = parentArray;
    this.name = name;
    this.type = type;

    // SIZE
    // wpix, hpix: window size in pixels values
    // wmin, wmax, hmin, hmax: the min and max size of the window that should have impact on its effects (despite this min max, it can be dragged bigger nontheless)
    // wmapped, hmapped: size from 0-100 within it's min and max sizes
    this.size = {wpix:160,hpix:160,wmin:160,wmax:500,hmin:160,hmax:500,wmapped:0,hmapped:0};

    // POSITION
    // xpix, ypix: position in pixel values on screen
    // DEPRECATED: xperc, yperc: position in percentage of screen (DEPRECATED)
    // xmapped, ymapped: position from 0-100 in between the sceenBoundaries declared on top of this script, anchor point is the middle of the window
    // NOTE: the position anchor should be the center of the window
    this.startingX = 50; // in percent
    this.startingY = 75; // in percent
    let animationStartX = 50;
    let animationStartY = 0;

    this.pos = {
      xpix: this.mappedxToPixelX(animationStartX),
      ypix: this.mappedyToPixelY(animationStartY),
      xmapped: animationStartX,
      ymapped: animationStartY
    }; 


    // ACTIVITY:
    this.active = true;

    // POSITION TRACKER (processing intensive):
    this.prevPos = Object.assign({}, this.pos);
    this.positionCheckerInterval;
    this.posCheckInterval = 10;

    // unique identifier of this window
    this.uid = "id" + Math.random().toString(16).slice(2)

    
    this.settings = new Settings(this.type);
    console.log(this.settings);

    
    // opening this window in the usual way
    // left is set to 0 because of the opening animation defined below
    this.options = 'left='+this.mappedxToPixelX(animationStartX)+',top='+this.mappedyToPixelY(animationStartY)+',width='+this.size.wpix+',height='+this.size.hpix;
    // additional options can be added here:
    this.otherOptions = 'popup=yes';
    if(this.otherOptions!=""){
      this.options += ","+this.otherOptions;
    }
    this.win = window.open('window', '', this.options);
    this.win.type = this.type; // window can do things based on its type (i.e. different styling)

    this.win.addEventListener("load", ()=>{
      
      this.changeName(name)
      this.displaySpaceInfo();

      // INSTRUMENT
      this.instrument = new Instrument(this.type, this.settings, this.size, this.pos, this.displayInfo.bind(this));

      // OPENING ANIMATION
      this.openingAnimation(animationStartX, animationStartY);
    });
    
    // NAVIGATION
    // the window's corresponding interface in the main window:
    this.nav = new Nav(this.parentDOMelm, name, this.type, this.settings, this.changeName.bind(this), this.selfDestroy.bind(this), this.uid, this.settingsChanged.bind(this))

    // LISTENERS
    // CLOSING WINDOW (Listener)
    this.win.addEventListener("visibilitychange", this.checkClosed.bind(this))
    // ACTIVE
    this.win.addEventListener("focus", this.focused.bind(this))  
    // INACTIVE
    this.win.addEventListener("blur", this.blurred.bind(this))
    // RESIZE
    this.win.addEventListener("resize", this.resized.bind(this))
    

  }
  mappedxToPixelX(mappedx){
    return mapValue(mappedx, 0, 100, screenBoundaries.left-this.size.wpix/2, screenSize.w-screenBoundaries.right-this.size.wpix/2);
  }
  pixelXtoMappedX(pixelX){
    return mapValue(pixelX, screenBoundaries.left-this.size.wpix/2, screenSize.w-screenBoundaries.right-this.size.wpix/2, 0, 100);
  }
  mappedyToPixelY(mappedy){
    // console.log(screenBoundaries.top-this.size.hpix/2)
    return mapValue(mappedy, 0, 100, screenSize.h-screenBoundaries.bottom-this.size.hpix/2, screenBoundaries.top-this.size.hpix/2)
  }
  pixelYtoMappedY(pixelY){
    return mapValue(pixelY, screenSize.h-screenBoundaries.bottom-this.size.hpix/2, screenBoundaries.top-this.size.hpix/2, 0, 100);
  }
  openingAnimation(startX_, startY_){
    let goalX = this.mappedxToPixelX( this.startingX ); 
    let goalY = this.mappedyToPixelY( this.startingY ); 
    let speed = 15;
    let xspeed = (this.pos.xpix<goalX?1:-1)*speed;
    let yspeed = (this.pos.ypix<goalY?1:-1)*speed;
    setTimeout(()=>{
      let openAnimation = setInterval(()=>{
        let xDist = goalX-this.pos.xpix;
        let yDist = goalY-this.pos.ypix;
        if(xDist == 0 && yDist == 0){
          clearInterval(openAnimation);
          if(this.active){
            this.startPosChecker();
          }
        }else{
          if(xDist!=0){
            this.pos.xpix += Math.abs(xspeed)<Math.abs(xDist)?xspeed:xDist;
            this.pos.xmapped = this.pixelXtoMappedX(this.pos.xpix);
          }
          if(yDist!=0){
            this.pos.ypix += Math.abs(yspeed)<Math.abs(yDist)?yspeed:yDist;
            this.pos.ymapped = this.pixelYtoMappedY(this.pos.ypix)
          }
          this.moveToPix(this.pos.xpix, this.pos.ypix);
          this.instrument.posChanged(this.pos);
        }
      }, 35);
    }, 300)
  }
  moveToPix(x, y){
    this.win.moveTo(x, y);
    this.displaySpaceInfo();
  }
  changeName(newName){
    this.name = newName;
    
    // call function inside window to make it change its display name
    this.win.changeName(newName);
  }
  displaySpaceInfo(){
    this.displayInfo([
      {
        label: "pos (p)",
        textvalue: this.pos.xpix + "  " + this.pos.ypix
      },
      {
        label: "pos (%)",
        textvalue: this.pos.xmapped.toFixed(1) + "  " + this.pos.ymapped.toFixed(1)
      },
      {
        label: "size (p)",
        textvalue: this.size.wpix + "  " + this.size.hpix
      },
      {
        label: "size (%)",
        textvalue: this.size.wmapped.toFixed(1) + "  " + this.size.hmapped.toFixed(1)
      }
    ])
  }
  displayInfo(infoItems){
    this.win.displayInfo(infoItems);
  }

  focused(){
    if(this.active) return;
    this.active = true;
    this.startPosChecker();
    this.nav.focused();
  }
  blurred(){
    if(!this.active) return;
    this.active = false;
    this.stopPosChecker();
    this.nav.blurred();

  }

  startPosChecker(){
    console.log("start")
    this.positionCheckerInterval = setInterval(()=>{
      // console.log("checking")
      this.pos.xpix = this.win.screenX;
      this.pos.ypix = this.win.screenY;
      // this.pos.xperc = (this.win.screenX/screenSize.w)*100;
      // this.pos.yperc = (this.win.screenY/screenSize.h)*100;
      this.pos.xmapped = this.pixelXtoMappedX(this.pos.xpix);
      this.pos.ymapped = this.pixelYtoMappedY(this.pos.ypix);
      // this.win.displayInfo(this.pos, this.size);
      this.displaySpaceInfo();

      // console.log(this.pos.xmapped.toFixed(0), this.prevPos.xmapped.toFixed(0) )
      // console.log(this.pos.ymapped.toFixed(0), this.prevPos.ymapped.toFixed(0) )
      let sensitivity = 0; //0 means it only sees a change when xmapped and y mapped changed by a whole percentage point.
      if(
        this.pos.xmapped.toFixed(sensitivity) != this.prevPos.xmapped.toFixed(sensitivity) 
        || 
        this.pos.ymapped.toFixed(sensitivity) != this.prevPos.ymapped.toFixed(sensitivity)){
        
          // console.log("posChanged");
          this.instrument.posChanged(this.pos);
       
      }

      this.prevPos = Object.assign({}, this.pos);


    }, this.posCheckInterval)
  }
  stopPosChecker(){
    clearInterval(this.positionCheckerInterval);
  }

  resized(){
    this.size.wpix = this.win.innerWidth;
    this.size.hpix = this.win.innerHeight;
    this.size.wmapped = mapValue(this.win.innerWidth, this.size.wmin, this.size.wmax, 0, 100 );
    this.size.hmapped = mapValue(this.win.innerHeight, this.size.hmin, this.size.hmax, 0, 100 );
    this.displaySpaceInfo();
    this.instrument.sizeChanged(this.size);
  }

  selfDestroy(){
    // close the window 
    if(!this.win.closed){
      console.log("closing", this.name);
      this.win.close();
    }
    // close the nav
    this.nav.destroy();
    // take window object out of array
    for(let i = this.parentArray.length-1; i>=0; i--){
      if(this == this.parentArray[i]){
        this.parentArray.splice(i, 1);
      }
    }
    // destroy the instrument
    this.instrument.destroy();
  }

  checkClosed(){
    setTimeout(()=>{
      if(this.win.closed){
        this.selfDestroy();
      }
    }, 150)
  }

  settingsChanged(settingType){
    console.log(this.uid, " ", settingType, " has changed", this.settings);
    if(settingType == "oscillatorType"){
      let newOscType = this.getCurrentSettingById("oscillatorType");
      this.instrument.changeOscillatorType(newOscType);
    }else if(settingType == "noiseType"){
      let newNoiseType = this.getCurrentSettingById("noiseType");
      this.instrument.changeNoiseType(newNoiseType);
    }
  }
  getCurrentSettingById(id){
    let setting = this.settings.settings.find(s=>s.id==id)
    // console.log(setting)
    if(setting.type == "radio"){
      return setting.options[setting.currentOptionIdx]
    }
    // return this.settings.settings.find(s=>s.id=="oscillatorType")
  }

}

class Settings{
  constructor(type){
    this.type = type;
    this.settings = [
      // universal settings here
      {
        id: "overlayInfo",
        name: "overlay info",
        type: "boolean",
        currentValue: true
      }
    ]
    if(this.type == "osc"){
      this.settings.push(
        {
          id: "oscillatorType",
          name: "oscillator type",
          type: "radio",
          options: ["triangle", "sine", "square", "sawtooth"],
          currentOptionIdx: 0
        }
      )
    }else if(this.type == "noise"){
      this.settings.push(
        {
          id: "noiseType",
          name: "noise type",
          type: "radio",
          options: ["pink", "brown", "white"],
          currentOptionIdx: 0
        }
      )
    }
  }
}

class Instrument{
  constructor(type, settings, size, pos, displayInfoFunction){
    this.pos = pos;
    this.size = size;
    this.displayInfo = displayInfoFunction;
    this.type = type;
    this.settings = settings;

    this.soundSpecs = this.recalculateSoundSpecs(this.type)
   



    let startGain = logMapValue(pos.ymapped, 0, 100, this.soundSpecs.gainMin, this.soundSpecs.gainMax);
    this.gain = new Tone.Gain( startGain  ).toDestination();
    
    let startPan = mapValue(pos.ymapped, 0, 100, -1, 1);
    this.panner = new Tone.Panner( startPan );
    this.displayInfo([
      {
        label: "gain",
        textvalue: startGain.toFixed(2)
      },
      {
        label: "pan",
        textvalue: startPan.toFixed(2)
      }
    ])

    

    this.ins = undefined;
    if(type == "osc"){

      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq.toFixed(0)
        },
      ])
      let oscType = this.getCurrentSettingById("oscillatorType");
      this.ins = new Tone.Oscillator(freq, oscType);
      this.ins.start();
    }else if(type == "noise"){
      // "frequency" is "playbackRate" in this case
      let playbackRate = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      this.displayInfo([
        {
          label: "pbr",
          textvalue: playbackRate.toFixed(0)
        },
      ])
      let noiseType = this.getCurrentSettingById("noiseType");
      this.ins = new Tone.Noise(noiseType);
      this.ins.playbackRate = Math.round(playbackRate);
      this.ins.start();
    }else if(type == "fmSynth"){
      // "frequency" is "playbackRate" in this case
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq.toFixed(0)
        },
      ])
      // let noiseType = this.getCurrentSettingById("noiseType");
      this.ins = new Tone.FMSynth();
      this.ins.triggerAttack(freq);
      // this.ins.playbackRate = Math.round(playbackRate);
    }else if(type == "membraneSynth"){
      // this.kicked = false;
      this.stopDetection;// = [this.pos];
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq.toFixed(0)
        },
      ]);
      this.ins = new Tone.MembraneSynth();

    }else if(type == "pluckSynth"){
      // this.kicked = false;
      this.stopDetection;// = [this.pos];
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq.toFixed(0)
        },
      ]);
      this.ins = new Tone.PluckSynth();

    }

    this.ins.chain(this.panner, this.gain);
    this.gain.toDestination();


    

  }
  recalculateSoundSpecs(type){
    let gainMin, gainMax;
    let freqMin, freqMax;
    if(type == "osc"){
      let oscType = this.getCurrentSettingById("oscillatorType");
      if(oscType == "sine"){
        gainMin = 0;
        gainMax = 5.5;
        freqMin = 100;
        freqMax = 4000;
      }else if(oscType == "square"){
        gainMin = 0;
        gainMax = 0.7;
        freqMin = 40;
        freqMax = 4000;
      }else if(oscType == "sawtooth"){
        gainMin = 0;
        gainMax = 0.7;
        freqMin = 100;
        freqMax = 4000;
      }else if(oscType == "triangle"){
        gainMin = 0;
        gainMax = 5.5;
        freqMin = 70;
        freqMax = 4000;
      }
    }else if(type == "noise"){
      let oscType = this.getCurrentSettingById("noiseType");
      if(oscType == "pink"){
        gainMin = 0;
        gainMax = 2.5;
        freqMin = 10;
        freqMax = 1110;
      }else if(oscType == "brown"){
        gainMin = 0;
        gainMax = 2.5;
        freqMin = 10;
        freqMax = 1110;
      }else if(oscType == "white"){
        gainMin = 0;
        gainMax = 1;
        freqMin = 10;
        freqMax = 1010;
      }
    }else if(type == "fmSynth"){
      gainMin = 0;
      gainMax = 2;
      freqMin = 100;
      freqMax = 2000;
    }else if(type == "membraneSynth"){
      gainMin = 0;
      gainMax = 3;
      freqMin = 100;
      freqMax = 2000;
    }else if(type == "pluckSynth"){
      gainMin = 0;
      gainMax = 5;
      freqMin = 50;
      freqMax = 1000;
    }

    return{
      gainMin: gainMin,
      gainMax: gainMax, 
      freqMin: freqMin, 
      freqMax: freqMax 
    }

  }
  reassessPosSize(){
    this.posChanged(this.pos)
    this.sizeChanged(this.size)
  }
  changeOscillatorType(newOscType){
    if(this.type != "osc") return
    this.gain.gain.value = 0;
    this.oscType  = newOscType;
    this.soundSpecs = this.recalculateSoundSpecs("osc")
    setTimeout(()=>{
      this.ins.type = newOscType;
      this.reassessPosSize();
    }, 250)
    
  }
  changeNoiseType(newNoiseType){
    if(this.type != "noise") return
    // console.log("setting", newOscType)
    this.gain.gain.value = 0;
    this.noiseType = newNoiseType;
    this.soundSpecs = this.recalculateSoundSpecs("noise")
    setTimeout(()=>{
      this.ins.type = newNoiseType;
      this.reassessPosSize();
    }, 250)
  }
 
  posChanged(pos){
    let g = logMapValue(pos.ymapped, 0, 100, this.soundSpecs.gainMin, this.soundSpecs.gainMax);
    // this.gain.gain.value = g;
    this.gain.gain.rampTo(g, 0.05);
    let p = mapValue(pos.xmapped, 0, 100, -1, 1);
    // this.panner.pan.value = p;
    this.panner.pan.rampTo(p, 0.05);
    this.displayInfo([
      {
        label: "gain",
        textvalue: g.toFixed(2)
      },
      {
        label: "pan",
        textvalue: p.toFixed(2)
      }
    ]);
    if(this.type == "membraneSynth"){
      console.log("yoyoyo");
      // if(this.stopDetection){
      clearTimeout(this.stopDetection);
      // }
      this.stopDetection = setTimeout(()=>{
        let freq = mapValue( (this.size.wmapped + this.size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
        console.log("boom")
        this.ins.triggerAttackRelease(freq, 0.1);
      }, 50)
    }else if(this.type == "pluckSynth"){

      clearTimeout(this.stopDetection);
      // }
      this.stopDetection = setTimeout(()=>{
        let freq = mapValue( (this.size.wmapped + this.size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
        console.log("boom")
        this.ins.triggerAttackRelease(freq, 0.01);
      }, 50)
    }
  }
  sizeChanged(size){

    if(this.type == "osc"){
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      freq = Math.round(freq);
      // console.log(freq)
      this.ins.frequency.value = freq;
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq
        },
      ])
    }else if(this.type == "noise"){
      let playbackRate = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      playbackRate = Math.round(playbackRate);
      this.ins.playbackRate = Math.round(playbackRate);
      this.displayInfo([
        {
          label: "pbr",
          textvalue: playbackRate
        },
      ])
    }else if(this.type == "fmSynth"){
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      freq = Math.round(freq);

      // this.ins.frequency.value = freq;
      this.ins.triggerAttack(freq);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq
        },
      ])
    }else if(this.type == "membraneSynth" || this.type == "pluckSynth"){
      let freq = mapValue( (size.wmapped + size.hmapped)/200, 0, 1, this.soundSpecs.freqMin, this.soundSpecs.freqMax);
      freq = Math.round(freq);
      // this.ins.frequency.value = freq;
      // this.ins.triggerAttack(freq);
      this.displayInfo([
        {
          label: "freq",
          textvalue: freq
        },
      ])
    }

    
  }
  destroy(){
    this.gain.dispose();
    this.panner.dispose();
    this.ins.dispose();
  }
  getCurrentSettingById(id){
    let setting = this.settings.settings.find(s=>s.id==id)
    if(setting.type == "radio"){
      return setting.options[setting.currentOptionIdx]
    }
  }

}

class Nav{
  constructor(parent, name, type, settings, changeNameFunction, destroyFunction, uniqueID, settingsChanged){

    this.uid = uniqueID;
    this.parentElm = parent;
    this.type = type;
    this.settings = settings;
    this.confirmChange = settingsChanged;
    // MAIN CONTAINER
    this.container = document.createElement("div");
    this.container.className = "windowItem";
    this.container.style.backgroundColor = "#efefef";
    this.container.style.borderColor = "#1000ff";
    this.parentElm.appendChild(this.container)
    // LEFT CONTAINER
    this.leftContainer = document.createElement("div");
    this.leftContainer.className = "windowItemLeft";
    this.container.appendChild(this.leftContainer)
     // RIGHT CONTAINER
    this.rightContainer = document.createElement("div");
    this.rightContainer.className = "windowItemRight";
    this.container.appendChild(this.rightContainer)
    //LEFT CONTAINER TOP
    this.leftContainerTop = document.createElement("div");
    this.leftContainerTop.className = "windowItemLeftTop";
    this.leftContainer.appendChild(this.leftContainerTop)
    //LEFT CONTAINER BOTTOM
    this.leftContainerBottom = document.createElement("div");
    this.leftContainerBottom.className = "windowItemLeftBottom";
    this.leftContainer.appendChild(this.leftContainerBottom)


    // NAME
    this.nameElm = document.createElement("input")
    this.nameElm.type = "text";
    this.nameElm.value = name;
    this.nameElm.placeholder = "window name";
    this.nameElm.addEventListener("input", v=>{changeNameFunction(v.target.value)});
    this.leftContainerTop.appendChild(this.nameElm)

    // OVERLAY INFO



    // OSCILLATOR
    if(this.type == "osc"){
      // console.log("SEtttINgs", this.settings)
      // OSCILLATOR TYPE:
      this.oscTypeContainer = document.createElement("div");
      this.oscTypeContainer.className = "verticalFlex";
      let oscTypeSettings = this.settings.settings.find(i=>i.id=="oscillatorType")
      this.makeRadioTextButtons(oscTypeSettings, this.oscTypeContainer);
      this.leftContainerTop.appendChild(this.oscTypeContainer);
    }
    
    
    // NOISE
    if(this.type == "noise"){
      // console.log("SEtttINgs", this.settings)
      // OSCILLATOR TYPE:
      this.noiseTypeContainer = document.createElement("div");
      this.noiseTypeContainer.className = "verticalFlex";
      let noiseTypeSettings = this.settings.settings.find(i=>i.id=="noiseType")
      this.makeRadioTextButtons(noiseTypeSettings, this.noiseTypeContainer);
      this.leftContainerTop.appendChild(this.noiseTypeContainer);
    }

    // this.colorPickerElm = document.createElement("div");
    // this.colorPickerElm.className = "colorPickerElm";
    // this.leftContainerTop.appendChild(this.colorPickerElm);
    // this.color1elm = document.createElement("div");
    // this.colorPickerElm.appendChild(this.color1elm);
    // this.color2elm = document.createElement("div");
    // this.colorPickerElm.appendChild(this.color2elm);
    // this.color3elm = document.createElement("div");
    // this.colorPickerElm.appendChild(this.color3elm);



    // this.curvePickerElm = document.createElement("div");
    // this.curvePickerElm.className = "curvePickerElm";
    // this.leftContainerTop.appendChild(this.curvePickerElm);

    // this.curve1elm = document.createElement("div");
    // let img = document.createElement("img");
    // img.src="assets/sine.png";
    // this.curve1elm.appendChild(img);
    // this.curvePickerElm.appendChild(this.curve1elm);

    // this.curve2elm = document.createElement("div");
    // let img2 = document.createElement("img");
    // img2.src="assets/square.png";
    // this.curve2elm.appendChild(img2);
    // this.curvePickerElm.appendChild(this.curve2elm);

    // this.curve3elm = document.createElement("div");
    // let img3 = document.createElement("img");
    // img3.src="assets/saw.png";
    // this.curve3elm.appendChild(img3);
    // this.curvePickerElm.appendChild(this.curve3elm);

    // this.curve4elm = document.createElement("div");
    // let img4 = document.createElement("img");
    // img4.src="assets/triangle.png";
    // this.curve4elm.appendChild(img4);
    // this.curvePickerElm.appendChild(this.curve4elm);

    



    // MODE (to be worked on)
    this.modePicker1 = this.makeModePicker("free", "f");
    this.modePicker1.querySelector("input").checked = true;
    this.modePicker2 = this.makeModePicker("replay", "p");
    this.modePicker3 = this.makeModePicker("record", "r");
    this.modePicker4 = this.makeModePicker("mute", "m");



    // CLOSE
    this.closeElm = document.createElement("a");
    this.closeElm.href = "#";
    this.closeElm.className = "closeButton";
    this.closeElm.addEventListener("click", destroyFunction);
    this.closeElm.innerHTML = "close";
    this.rightContainer.appendChild(this.closeElm)



  }

  makeRadioTextButtons(settings, container){
    console.log(settings);
    let ps = [];
    for(let i = 0; i< settings.options.length; i++){
      let setting = settings.options[i];
      let p = document.createElement("p");
      p.setAttribute("data-idx", i); 
      p.innerHTML = setting;
      p.className = this.uid + " radioTextButton " + settings.id;
      if(settings.currentOptionIdx == i){
        p.className += " active";
      }
      ps.push(p)
      container.append(p)
    }
    ps.forEach(p=>{
      p.addEventListener("click", ()=>{
        ps.forEach(other=>other.classList.remove("active"))
        p.className += " active";
        settings.currentOptionIdx = Number(p.getAttribute("data-idx"))
        console.log(settings);
        this.confirmChange(settings.id);

      })
    })
  }

  makeModePicker(label, shortcut){
    let modePicker = document.createElement("div");
    modePicker.className = "modePicker";
    this.leftContainerBottom.appendChild(modePicker)

    let inp = document.createElement("input");
    inp.type = "radio";
    inp.name = "modeRadio"+this.uid;
    inp.value = label;
    let labelelm = document.createElement("p");
    labelelm.innerHTML = label + " (" + shortcut + ")";
    modePicker.appendChild(inp);
    modePicker.appendChild(labelelm);
    modePicker.addShortcut = function(){
      labelelm.innerHTML = label + " (" + shortcut + ")"
    }
    modePicker.removeShortcut = function(){
      labelelm.innerHTML = label
    }
    return modePicker
  }
  focused(){
    this.container.style.backgroundColor = "#efefef";
    this.container.style.borderColor = "#1000ff";
    this.modePicker1.addShortcut();
    this.modePicker2.addShortcut();
    this.modePicker3.addShortcut();
    this.modePicker4.addShortcut();
  }
  blurred(){
    this.container.style.backgroundColor = "white";
    this.container.style.borderColor = "black";
    this.modePicker1.removeShortcut();
    this.modePicker2.removeShortcut();
    this.modePicker3.removeShortcut();
    this.modePicker4.removeShortcut();
    
  }
  destroy(){
    this.container.remove();
  }
  // nameChanging(value){
  //   console.log(value.target.value);
  //   this.changeNameFunction(value.target.value)
  // }
}

// from: https://gist.github.com/xposedbones/75ebaef3c10060a3ee3b246166caab56
// function mapValue(val, in_min, in_max, out_min, out_max) {
//   let out = (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
//   out = out>out_max?out_max:out;
//   out = out<out_min?out_min:out;
//   return out
// }


//function from p5: https://github.com/processing/p5.js/blob/main/src/math/calculation.js#L440
function constrain(n, low, high) {
  return Math.max(Math.min(n, high), low);
};
function mapValue(n, start1, stop1, start2, stop2) {
  // p5._validateParameters('map', arguments);
  const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
  // if (!withinBounds) {
  //   return newval;
  // }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  } else {
    return constrain(newval, stop2, start2);
  }
};

function logMapValue(position, start1, stop1, start2, stop2) {
  // position will be between 0 and 100
  var minp = start1;
  var maxp = stop1;

  let degree = 800;
  // The result should be between 100 an 10000000
  var minv = Math.log(stop1);
  var maxv = Math.log(degree);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);

  // return Math.exp(minv + scale*(position-minp));

  return mapValue( Math.exp(minv + scale*(position-minp)) , stop1, degree, start2, stop2)
}


// from: https://stackoverflow.com/a/14767071
function inWords (num) {
    var a = ['','one','two','three','four', 'five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    var b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + '' + a[n[5][1]]) : '';
    return str;
}
