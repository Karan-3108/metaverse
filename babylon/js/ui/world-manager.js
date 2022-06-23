import {METAVERSE} from '../client/metaverse.js';
import {METAVERSEUI} from './metaverse-ui.js';
import {Avatar} from './avatar.js';
import {VideoAvatar} from './video-avatar.js';
import {ServerFolder} from './server-folder.js';

/**
Manages world events: tracks local user events and sends them to the server, 
and tracks network events and applies them to local scene.
Loads avatars of other users and maps network events to their avatars, 
including user video and audio streams.
 */
export class WorldManager {
  /** Creates world manager with default values and connection, scene, camera listeners.
  @param world
  @param fps network framerate, default 5 (send up to 5 events per second)
   */
  constructor(world, fps) {
    /** the world */
    this.world = world;
    /** the scene */
    this.scene = world.scene;
    /** Movement resolution, default 1 cm/3.6 deg. Any movement less than this will be ignored.*/
    this.resolution = 0.01; // 1 cm/3.6 deg
    /** Create animations for movement of avatars, default true. Recommended for low fps.*/
    this.createAnimations = true;
    /** Custom avatar options, applied to avatars after loading. Currently video avatars only */
    this.customOptions = null;
    /** Whether to track user rotation, default true. */
    this.trackRotation = true;
    /** Used in 3rd person view */
    this.mesh = null;
    /** This is set once we connect to streaming server */
    this.mediaStreams = null;
    /** Listeners notified after own avatar property (e.g. position) has changed and published */
    this.myChangeListeners = []
    /** Change listeners receive changes applied to all shared objects */
    this.changeListeners = [];
    /** Optionally called after an avatar has loaded. Callback is passed VRObject and avatar object as parameters.
    Avatar object can be either Avatar or VideoAvatar instance, or an AssetContainer.
    */
    this.loadCallback = null;
    /** Avatar factory, default this.createAvatar */
    this.avatarFactory = this.createAvatar;
    /** Default position applied after an avatar loads */
    this.defaultPosition = new BABYLON.Vector3( 1000, 1000, 1000 );
    /** Default rotation applied after an avatar loads */
    this.defaultRotation = new BABYLON.Vector3( 0, 0, 0 );
    /** Mobile browsers don't have javascript console, and USB debugging is next to useless.
    Enable to redirect all console output to the server log. Sure, it starts only after connection to the server is established.
     */
    this.remoteLogging = false;
    if ( ! this.scene.activeCamera ) {
      console.log("Undefined camera in WorldManager, tracking disabled")
    } else {
      this.trackCamera();
    }
    this.scene.onActiveCameraChanged.add( () => { this.trackCamera() } );
    this.METAVERSE = METAVERSE;
    /** Network frames per second, default 5 */
    this.fps = 5;
    if ( fps ) {
      this.fps = fps
    }
    /** Current position */
    this.pos = { x: null, y: null, z: null };
    /** Current rotation */
    this.rot = { x: null, y: null, z: null };
    /** Current left arm position */
    this.leftArmPos = { x: null, y: null, z: null };
    /** Current right arm position */
    this.rightArmPos = { x: null, y: null, z: null };
    /** Current left arm rotation */
    this.leftArmRot = { x: null, y: null, z: null, w: null };
    /** Current right arm rotation */
    this.rightArmRot = { x: null, y: null, z: null, w: null };
    /** User height in real world, default 1.8 */
    this.userHeight = 1.8;
    /** Called when loading fails, default null. */
    this.loadErrorHandler = null;
    this.interval = null;
    METAVERSE.addWelcomeListener((welcome) => this.setSessionStatus(true));
    METAVERSE.addSceneListener((e) => this.sceneChanged(e));
    /** Enable debug output */
    this.debug = false;
    this.world.worldManager = this;
    this.notFound = []; // 404 cache used for avatar fix files
  }

  /** Publish and subscribe */
  pubSub( client, autoPublishVideo ) {
    // CHECKME: should it be OpenVidu or general streaming service name?
    if ( this.mediaStreams && client.tokens && client.tokens.OpenVidu ) {
      this.log("Subscribing as client "+client.id+" with token "+client.tokens.OpenVidu);
      // obtain token and start pub/sub voices
      if ( autoPublishVideo ) {
        this.mediaStreams.startVideo = true;
        this.mediaStreams.videoSource = undefined;
      }
      this.mediaStreams.connect(client.token).then(() => this.mediaStreams.publish());
    }
  }

  /** Optionally log something */
  log( what ) {
    if (this.debug) {
      console.log(what);
    }
  }
  
  /** Track a mesh, used in 3rd person view */
  trackMesh(mesh) {
    if ( mesh ) {
      this.log("Tracking mesh "+mesh.id);
    } else if ( this.mesh ) {
      this.log("Stopped tracking mesh "+this.mesh.id);
    }
    this.mesh = mesh;
  }
  
  /** Tracks active camera */
  trackCamera(camera) {
    if ( ! camera ) {
      camera = this.scene.activeCamera;
    }
    if ( camera ) {
      this.log("Tracking camera "+camera.getClassName())
      this.camera = camera;
    }
  }
  
  /** Called when connection to the server is established (connection listener)*/
  setSessionStatus(active) {
    this.log("Session status: "+active);
    if ( active ) {
      if ( ! this.interval ) {
        this.interval = setInterval(() => this.trackChanges(), 1000/this.fps);        
      }
    } else if ( this.interval ) {
      clearInterval( this.interval );
      this.interval = null;
    }
  }
  
  /** Returns true if connected to the server and session is active*/
  isOnline() {
    return this.interval != null;
  }

  /** Callend when scene has changed (scene listener). 
  If an object was added, calls either loadAvatar, loadStream or loadMesh, as appropriate.
  If an object was removed, calls removeMesh.
  @param e SceneEvent containing the change
  */
  sceneChanged(e) {
    if (e.added != null) {
      this.log("ADDED " + e.objectId + " new size " + e.scene.size);
      this.log(e);
      // FIXME: need better way to determine avatar type
      if ( e.added.hasAvatar && e.added.hasAvatar()) {
        this.loadAvatar( e.added );
      } else if ("video" === e.added.mesh) {
        this.loadStream( e.added );
      } else if (e.added.mesh) {
        this.loadMesh(e.added);
      } else {
        // TODO server needs to ensure that mesh exists
        // in the meantime we define default behavior here
        console.log("WARNING: can't load "+e.objectId+" - no mesh");
      }
    } else if (e.removed != null) {
      this.log("REMOVED " + e.objectId + " new size " + e.scene.size)
      this.removeMesh( e.removed );
    } else {
      this.log("ERROR: invalid scene event");
    }
  }

  /** Default video avatar factory method */
  createAvatar(obj) {
    return new VideoAvatar(this.scene, null, this.customOptions);
  }
  
  /**
  Load a video avatar, attach a listener to it.
   */
  loadStream( obj ) {
    this.log("loading stream for "+obj.id);
    
    var video = this.avatarFactory(obj);
    video.autoStart = false;
    video.autoAttach = false;
    if ( obj.name ) {
      video.altText = obj.name;    
    } else {
      video.altText = "u"+obj.id;
    }
    video.show();
    video.mesh.name = obj.mesh;
    // obfuscators get in the way 
    //video.mesh.id = obj.constructor.name+" "+obj.id;
    video.mesh.id = obj.className+" "+obj.id;
    obj.video = video;
    
    var parent = new BABYLON.TransformNode("Root of "+video.mesh.id, this.scene);
    video.mesh.parent = parent;
    parent.VRObject = obj;
          
    this.log("Added stream "+obj.id);
    
    if ( obj.position.x == 0 && obj.position.y == 0 && obj.position.z == 0) {
      // avatar position has not yet been initialized, use default
      parent.position = new BABYLON.Vector3(this.defaultPosition.x,this.defaultPosition.y,this.defaultPosition.z); 
      obj.position = this.defaultPosition;
      var initialPosition = { position: {} };
      this.changeObject( obj, initialPosition, parent );
    } else {
      // apply known position
      parent.position = new BABYLON.Vector3(obj.position.x, obj.position.y, obj.position.z)
    }
    
    if ( obj.rotation ) {
      if ( obj.rotation.x == 0 && obj.rotation.y == 0 && obj.rotation.z == 0) {
        // avatar rotation has not yet been initialized, use default
        parent.rotation = new BABYLON.Vector3(this.defaultRotation.x,this.defaultRotation.y,this.defaultRotation.z); 
        obj.rotation = this.defaultRotation;
        var initialRotation = { rotation: {} };
        this.changeObject( obj, initialRotation, parent );
      } else {
        // apply known rotation
        parent.rotation = new BABYLON.Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z)
      }
    }
    
    obj.addListener((obj, changes) => this.changeObject(obj, changes, parent));
    if ( this.mediaStreams ) {
      this.mediaStreams.streamToMesh(obj, video.mesh);
    } else {
      console.log("WARNING: unable to stream to "+obj.id+" - no MediaStreams")
    }
    this.notifyLoadListeners(obj,video);
  }
  
  /** Load a 3D avatar, attach a listener to it */
  async loadAvatar(obj) {
    this.log("loading avatar "+obj.mesh);
    var pos = obj.mesh.lastIndexOf('/');
    var path = obj.mesh.substring(0,pos);
    var file = obj.mesh.substring(pos+1);
    // FIXME really bad way to parse path and create ServerFolder
    pos = path.lastIndexOf('/');
    var baseUrl = path.substring(0,pos+1);
    var dir = path.substring(pos+1);
    
    //find if fix file exist
    var fix = baseUrl+dir+"-fixes.json"; // gltf fix - expected in top-level directory
    if ( file.toLowerCase().endsWith('.glb')) {
      // glb fixes - expected in the same directory
      fix = obj.mesh.substring(0,obj.mesh.lastIndexOf('.'))+'-fixes.json';
    }
    if ( ! this.notFound.includes(fix)) {
      await fetch(fix, {cache: 'no-cache'}).then(response => {
        if ( ! response.ok ) {
          this.notFound.push( fix );
          fix = null;
        }
      }).catch(err=>{
        // rather than not found we can get CORS error
        this.notFound.push(fix);
        fix = null;
        console.log(err);
      });
    } else {
      fix = null;
    }
    var folder = new ServerFolder( baseUrl, dir, fix );
    var avatar = new Avatar(this.scene, folder);
    avatar.file = file;
    avatar.fps = this.fps;
    avatar.userHeight = obj.userHeight;
    avatar.animateArms = this.createAnimations;
    avatar.turnAround = true; // GLTF characters are facing the user when loaded, turn it around
    avatar.debug = false;
    avatar.load( (avatar) => {
      // FIXME: this is not container but avatar
      obj.container = avatar;
      obj.instantiatedEntries = avatar.instantiatedEntries;
      avatar.VRObject = obj;
      // apply current name, position and rotation
      this.changeAvatar(obj, { name: obj.name, position: obj.position });
      if ( obj.rotation ) {
        // FIXME rotation can be null sometimes (offline users?)
        this.changeAvatar(obj, { rotation: obj.rotation });
      }
      // TODO also apply other non-null properties here
      if ( obj.animation ) {
        this.changeAvatar( obj, {animation: obj.animation});
      }
      // add listener to process changes
      obj.addListener((obj, changes) => this.changeAvatar(obj, changes));
      // subscribe to media stream here if available
      if ( this.mediaStreams ) {
        this.mediaStreams.streamToMesh(obj, obj.container.parentMesh);        
      }
      this.notifyLoadListeners(obj, avatar);
    });
  }
  
  notifyLoadListeners(obj, avatar) {
    if ( this.loadCallback ) {
      this.loadCallback(obj, avatar);
    }
  }
  
  /** Apply remote changes to an avatar (VRObject listener) */
  changeAvatar(obj,changes) {
    this.log( 'Processing changes on avatar' );
    this.log(changes);
    var avatar = obj.container;
    for ( var field in changes ) {
      var node = avatar.parentMesh;
      // TODO introduce event handler functions in Avatar class, use only routeEvent here
      if ( 'position' === field ) {
        if ( ! obj.translate ) {
          obj.translate = METAVERSEUI.createAnimation(node, "position", this.fps);
        }
        METAVERSEUI.updateAnimation(obj.translate, node.position, obj.position);
      } else if ( 'rotation' === field ) {
        if ( ! obj.rotate ) {
          obj.rotate = METAVERSEUI.createQuaternionAnimation(node, "rotationQuaternion", this.fps);
        }
        METAVERSEUI.updateQuaternionAnimation(obj.rotate, node.rotationQuaternion, obj.rotation);
      } else if ( 'animation' === field ) {
        avatar.startAnimation(obj.animation);
      } else if ( 'leftArmPos' === field ) {
        var pos = new BABYLON.Vector3(obj.leftArmPos.x, obj.leftArmPos.y, obj.leftArmPos.z);
        avatar.reachFor(avatar.body.rightArm, pos);
      } else if ( 'rightArmPos' === field ) {
        var pos = new BABYLON.Vector3(obj.rightArmPos.x, obj.rightArmPos.y, obj.rightArmPos.z);
        avatar.reachFor(avatar.body.leftArm, pos);
      } else if ( 'leftArmRot' === field ) {
        avatar.body.leftArm.pointerQuat = new BABYLON.Quaternion(obj.rightArmRot.x, obj.rightArmRot.y, obj.rightArmRot.z, obj.rightArmRot.w)
      } else if ( 'rightArmRot' === field ) {
        avatar.body.rightArm.pointerQuat = new BABYLON.Quaternion(obj.leftArmRot.x, obj.leftArmRot.y, obj.leftArmRot.z, obj.leftArmRot.w)
      } else if ( 'name' === field ) {
        avatar.setName(obj.name);
      } else if ( 'userHeight' === field ) {
        avatar.trackHeight(obj.userHeight);
      } else {
        this.routeEvent(obj,field,node);
      }
      this.notifyListeners( obj, field, node);
    }
  }

  notifyListeners(obj, field, node) {
    this.changeListeners.forEach( (l) => l(obj,field,node) );
  }
  
  addMyChangeListener( listener ) {
    METAVERSE.addListener( this.myChangeListeners, listener );
  }
  
  removeMyChangeListener( listener ) {
    METAVERSE.removeListener( this.myChangeListeners, listener );
  }
  
  /**
  Load an object and attach a listener.
   */
  loadMesh(obj) {
    this.log("Loading object "+obj.mesh);
    if ( ! obj.mesh ) {
      console.log("Null mesh of client "+obj.id);
      return;
    }
    METAVERSEUI.assetLoader.loadObject(obj, (mesh) => {
      this.log("loaded "+obj.mesh);
      
      var initialPosition = { position: {} };
      this.changeObject( obj, initialPosition );
      if ( obj.scale ) {
        this.changeObject( obj, {scale: {x:obj.scale.x, y:obj.scale.y, z:obj.scale.z}});
      }
      if ( obj.rotation ) {
        this.changeObject( obj, {rotation: {x:obj.rotation.x, y:obj.rotation.y, z:obj.rotation.z}});
      }

      // add listener to process changes
      obj.addListener((obj, changes) => this.changeObject(obj, changes));
      // subscribe to media stream here if available
      if ( this.mediaStreams ) {
        this.mediaStreams.streamToMesh(obj, mesh);        
      }
      this.notifyLoadListeners(obj, mesh);
    }, this.loadErrorHandler);
  }

  /**
  Utility method, calculates bounding box for an AssetContainer.
  @returns Vector3 bounding box
   */
  boundingBox(container) {
    var maxSize = new BABYLON.Vector3(0,0,0);
    for ( var i = 0; i < container.meshes.length; i++ ) {
      // have to recompute after scaling
      //container.meshes[i].computeWorldMatrix(true);
      container.meshes[i].refreshBoundingInfo();
      var boundingInfo = container.meshes[i].getBoundingInfo().boundingBox;
      //console.log("max: "+boundingInfo.maximumWorld+" min: "+boundingInfo.minimumWorld);
      var size = new BABYLON.Vector3(
        boundingInfo.maximumWorld.x - boundingInfo.minimumWorld.x,
        boundingInfo.maximumWorld.y - boundingInfo.minimumWorld.y,
        boundingInfo.maximumWorld.z - boundingInfo.minimumWorld.z
      );
      maxSize.x = Math.max(maxSize.x,size.x);
      maxSize.y = Math.max(maxSize.y,size.y);
      maxSize.z = Math.max(maxSize.z,size.z);
      //if (shadows) {
        //shadowGenerator.getShadowMap().renderList.push(container.meshes[i]);
      //}
    }
    console.log("BBoxMax: "+maxSize);
    return maxSize;
  }

  // works only for already displayed meshes
  bBox(mesh, maxSize) {
    if ( !maxSize ) {
      maxSize = new BABYLON.Vector3(0,0,0);
    }
    for ( var i = 0; i < mesh.getChildren().length; i++ ) {
      maxSize = this.bBox(mesh.getChildren()[i], maxSize);
    }
    if ( ! mesh.refreshBoundingInfo ) {
      // TypeError: mesh.refreshBoundingInfo is not a function
      return maxSize;
    }
    mesh.computeWorldMatrix(true);
    console.log(mesh.id);
    var boundingInfo = mesh.getBoundingInfo().boundingBox;
    var size = new BABYLON.Vector3(
      boundingInfo.maximumWorld.x - boundingInfo.minimumWorld.x,
      boundingInfo.maximumWorld.y - boundingInfo.minimumWorld.y,
      boundingInfo.maximumWorld.z - boundingInfo.minimumWorld.z
    );
    maxSize.x = Math.max(maxSize.x,size.x);
    maxSize.y = Math.max(maxSize.y,size.y);
    maxSize.z = Math.max(maxSize.z,size.z);
    console.log("BBoxMax: "+maxSize);
    return maxSize;
  }

  /**
  Utility method, calculates bounding box for an AssetContainer and returns maximum of x,y,z.
  Works only for meshes already rendered
   */
  bBoxMax(mesh) {
    var bbox = this.bBox( mesh );
    console.log("BBox: "+bbox);
    return Math.max( bbox.x, Math.max(bbox.y, bbox.z));
  }
  
  getRootNode( obj ) {
    if ( obj.container ) {
      return obj.container.meshes[0];
    } else if ( obj.instantiatedEntries ) {
      return obj.instantiatedEntries.rootNodes[0];
    }
    console.log("ERROR: unknown root for "+obj);
  }
  /** Apply remote changes to an object. */
  changeObject(obj,changes, node) {
    this.log("Changes on "+obj.id+": "+JSON.stringify(changes));
    if ( ! node ) {
      node = this.getRootNode(obj);
    }
    for ( var field in changes ) {
      if ( 'position' === field ) {
        if ( ! obj.translate ) {
          obj.translate = METAVERSEUI.createAnimation(node, "position", this.fps);
        }
        METAVERSEUI.updateAnimation(obj.translate, node.position, obj.position);
      } else if ( 'rotation' === field ) {
        if ( ! obj.rotate ) {
          obj.rotate = METAVERSEUI.createAnimation(node, "rotation", this.fps);
        }
        METAVERSEUI.updateAnimation(obj.rotate, node.rotation, obj.rotation);
      } else if ( 'scale' === field ) {
        if ( ! obj.rescale ) {
          obj.rescale = METAVERSEUI.createAnimation(node, "scaling", this.fps);
        }
        METAVERSEUI.updateAnimation(obj.rescale, node.scaling, obj.scale);
      } else {
        this.routeEvent( obj, field, node );
      }
      this.notifyListeners( obj, field, node);
    }
  }
  
  /** Called when applying changes other than rotation and translation:
  executes a method if such a method exists, passing it a current instance of associated VRObject.
  @param obj VRObject to apply change to
  @param field member field to set or method to execute 
   */
  routeEvent(obj, field, node) {
    var object = obj;
    if ( obj.container ) {
      object = obj.container;
    } else if ( obj.video ) {
      object = obj.video;
    } else if ( obj.instantiatedEntries ) {
      object = obj.instantiatedEntries;
    } else {
      this.log("Ignoring unknown event "+field+" to object "+obj.id);
      return;      
    }
    if (typeof object[field] === 'function') {
      object[field](obj);
    } else if (typeof obj[field+'Changed'] === 'function') {
      obj[field+'Changed'](obj);
    //} else if (object.hasOwnProperty(field)) {
    } else {
      console.log("Ignoring unknown event to "+obj+": "+field);
    }
  }

  /** Remove a mesh from the scene (scene listener), and dispose of everything.
  */
  removeMesh(obj) {
    if ( this.mediaStreams ) {
      this.mediaStreams.removeClient(obj);
    }
    METAVERSEUI.assetLoader.unloadObject(obj);
    if ( obj.video ) {
      obj.video.dispose();
      obj.video = null;
    }
    if ( obj.translate ) {
      obj.translate.dispose();
      obj.translate = null;
    }
    if ( obj.rotate ) {
      obj.rotate.dispose();
      obj.rotate = null;
    }
    if ( obj.rescale ) {
      obj.rescale.dispose();
      obj.rescale = null;
    }
    if ( obj.streamToMesh ) {
      obj.streamToMesh.dispose();
      obj.streamToMesh = null;
    }
    // TODO also remove object (avatar) from internal arrays
  }

  /**
  Periodically executed, as specified by fps. 
  Tracks changes to camera and XR controllers. 
  Calls checkChange, and if anything has changed, changes are sent to server,
  and to myChangeListeners. 
   */
  trackChanges() {
    var changes = [];
    if ( this.mesh ) {
      // tracking mesh (3rd person view)
      var pos = this.mesh.position;
      if ( this.mesh.ellipsoid ) {
        var height = this.mesh.position.y - this.mesh.ellipsoid.y;
        pos = new BABYLON.Vector3(this.mesh.position.x, height, this.mesh.position.z);
      }
      this.checkChange("position", this.pos, pos, changes);
      this.checkChange("rotation", this.rot, this.mesh.rotation, changes);
    } else {
      // tracking camera (1st person view)
      if ( ! this.camera ) {
        return;
      }
      // track camera movements
      if ( this.camera.ellipsoid ) {
        var height = this.camera.globalPosition.y - this.camera.ellipsoid.y*2;
        if ( this.camera.ellipsoidOffset ) {
          height += this.camera.ellipsoidOffset.y;
        }
        this.checkChange("position", this.pos, new BABYLON.Vector3(this.camera.globalPosition.x, height, this.camera.globalPosition.z), changes);
      } else {
        this.checkChange("position", this.pos, this.camera.globalPosition, changes);
      }
      if ( this.trackRotation ) {
        var cameraRotation = this.camera.rotation;
        if ( this.camera.getClassName() == 'WebXRCamera' ) {
          // CHECKME do other cameras require this?
          cameraRotation = this.camera.rotationQuaternion.toEulerAngles();
        }
        this.checkChange("rotation", this.rot, cameraRotation, changes);
      }
      
      // and now track controllers
      var vrHelper = this.world.vrHelper;
      if ( vrHelper ) {
        if ( vrHelper.leftController ) {
          this.checkChange( 'leftArmPos', this.leftArmPos, vrHelper.leftArmPos(), changes );
          this.checkChange( 'leftArmRot', this.leftArmRot, vrHelper.leftArmRot(), changes );
        }
        if ( vrHelper.rightController ) {
          this.checkChange( 'rightArmPos', this.rightArmPos, vrHelper.rightArmPos(), changes );
          this.checkChange( 'rightArmRot', this.rightArmRot, vrHelper.rightArmRot(), changes );
        }
        // track and transmit userHeight in VR
        if ( this.isChanged( this.userHeight, vrHelper.realWorldHeight(), this.resolution)) {
          this.userHeight = vrHelper.realWorldHeight();
          changes.push({field: 'userHeight', value: this.userHeight});
        }
      }
    }
    if ( changes.length > 0 ) {
      METAVERSE.sendMyChanges(changes);
      this.myChangeListeners.forEach( (listener) => listener(changes));
    }

  }
  
  /**
  Check if a value has changed, and update change array if so.
   */
  checkChange( field, obj, pos, changes ) {
    if ( this.isChanged(obj.x, pos.x, this.resolution) || 
        this.isChanged(obj.y, pos.y, this.resolution) || 
        this.isChanged(obj.z, pos.z, this.resolution) ) {
      this.log( Date.now()+": "+field + " changed, sending "+pos);
      obj.x = pos.x;
      obj.y = pos.y;
      obj.z = pos.z;
      changes.push({ field: field, value: pos});
    }
  }
  /**
  Return true if a value is ouside of given range.
   */
  isChanged( old, val, range ) {
    return val < old - range || val > old + range;
  }
  
  /**
  Enter the world specified by world.name. If not already connected, 
  first connect to world.serverUrl and set own properties, then start the session. 
  @param properties own properties to set before starting the session
  @return Welcome promise
   */
  async enter( properties ) {
    METAVERSE.addErrorListener((e)=>{
      console.log("Server error:"+e);
      this.error = e;
    });
    return new Promise( (resolve, reject) => {
      var afterEnter = (welcome) => {
        METAVERSE.removeWelcomeListener(afterEnter);
        this.world.entered(welcome)
        if ( this.remoteLogging ) {
          this.enableRemoteLogging();
        }
        resolve(welcome);
      };
      var afterConnect = (welcome) => {
        METAVERSE.removeWelcomeListener(afterConnect);
        if ( properties ) {
          for ( var prop in properties ) {
            METAVERSE.sendMy(prop, properties[prop]);
          }
        }
        // FIXME for the time being, Enter first, then Session
        if ( this.world.name ) {
          METAVERSE.addWelcomeListener(afterEnter);
          METAVERSE.sendCommand("Enter",{world:this.world.name});
          METAVERSE.sendCommand("Session");
        } else {
          METAVERSE.sendCommand("Session");
          this.world.entered(welcome)
          resolve(welcome);
        }
      };
      if ( ! this.isOnline() ) {
        METAVERSE.addWelcomeListener(afterConnect);
        METAVERSE.connect(this.world.serverUrl);
        METAVERSE.addConnectionListener((connected)=>{
          this.log('connected:'+connected);
          if ( ! connected ) {
            reject(this);
          }
        });
      } else if ( this.world.name ){
        METAVERSE.addWelcomeListener(afterEnter);
        METAVERSE.sendCommand("Enter",{world:this.world.name});
      }
    });
  }
  
  /** 
  Send own event.
  @param obj object containing changes to be sent, i.e. name-value pair(s).
   */
  sendMy( obj ) {
    METAVERSE.sendMyEvent(obj);
  }
  
  enableRemoteLogging() {
    var console=
    { 
      log: (arg) => {
        METAVERSE.sendCommand("Log", {message:arg}); // default log level is debug
      },
      info: (arg) => {
        METAVERSE.sendCommand("Log", {message:arg, severity:"info"});
      },
      warn: (arg) => {
        METAVERSE.sendCommand("Log", {message:arg, severity:"warn"});
      },
      error: (arg) => {
        METAVERSE.sendCommand("Log", {message:arg, severity:"error"});
      }
    };
    
    window.console = console;    
  }
  
}

