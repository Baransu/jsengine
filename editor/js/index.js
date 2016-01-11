const electron = require('electron');
const remote = electron.remote;
const Menu = remote.Menu;
const ipcRenderer = electron.ipcRenderer;

var fs = require('fs');
var watch = require('node-watch');
global.jQuery = $ = require('jquery');

var Amble = require('./js/amble-editor.js');

var scripts = [
    './js/camera.js',
];

var imgExtensionList = [
    'png',
    'jpg',
    'jpeg'
];

for(var i in scripts) {
    require(scripts[i]);
}

var projectDirectory = null;

var projectData = {};

var EDITOR = null;

var menuFunctions = {

    save: function() {
        var data = {};

        data.time = Date.now();
        data.scene = Amble.app.scene.createSceneFile();
        data.camera = {
            x: Amble.app.mainCamera.camera.position.x,
            y: Amble.app.mainCamera.camera.position.y
        };

        ipcRenderer.send('editor-save-respond', JSON.stringify(data));
    },

    build: function() {

        var data = {
            sceneFile: Amble.app.scene.createSceneFile(),
            imagesList: projectData.imgs,
            scriptsList: projectData.scripts
        };

        ipcRenderer.send('editor-build-respond', data);
    },

    play: function() {
        var data = {
            sceneFile: Amble.app.scene.createSceneFile(),
            imagesList: projectData.imgs,
            scriptsList: projectData.scripts
        };

        Amble.app.pause();
        ipcRenderer.send('editor-game-preview-respond', data);
    }

}

var menu = Menu.buildFromTemplate([
    {
        label: 'File',
        submenu: [
            // {
            //     label: 'New Project',
            //     accelerator: 'Ctrl+N',
            //     click: function(){
            //
            //         ipcRenderer.send('new-request');
            //
            //     }
            // },
            // {
            //     label: 'Open',
            //     accelerator: 'Ctrl+O',
            //     click: function() {
            //
            //         ipcRenderer.send('editor-open-request');
            //
            //     }
            // },
            {
                label: 'Save',
                accelerator: 'Ctrl+S',
                click: menuFunctions.save
            },
            {
                type: 'separator'
            },
            {
                label: 'Build',
                accelerator: 'Ctrl+B',
                click: menuFunctions.build
            },
            {
                label: 'Play',
                accelerator: 'Ctrl+P',
                click: menuFunctions.play
            }
        ]
    }
]);

Menu.setApplicationMenu(menu);

window.onload = function() {
    ipcRenderer.send('editor-app-loaded');
}

ipcRenderer.on('editor-game-preview-request', function() {
    menuFunctions.play();
});

ipcRenderer.on('editor-build-request', function() {
    menuFunctions.build();
});

ipcRenderer.on('editor-save-request', menuFunctions.save );

ipcRenderer.on('editor-unpause', function(event, data) {
    Amble.app.unpause();
});

// var debugConsole = document.getElementById('debug-console');
// debugConsole.addEventListener("dom-ready", function(){
//     debugConsole.openDevTools();
// });

ipcRenderer.on('game-preview-log', function(event, data) {
    Amble.app.debug.log(data);
});


ipcRenderer.on('game-preview-error', function(event, data) {
    Amble.app.debug.error(data);
});

ipcRenderer.on('editor-load-respond', function(event, data) {

    projectDirectory = data.path;
    projectData = data.project;

    console.log(projectData)

    projectData.imgs = [];
    projectData.scripts = [];

    document.getElementById('list').innerHTML = "";

    projectView.init();

    for(var i in projectData.scripts) {
        require(projectData.scripts[i].path);
    }

    //clear canvases
    document.getElementById('scene-view').innerHTML = "";

    //pass sprites to polymer
    // document.querySelector('renderer-component').sprites = projectData.imgs;

    //game
    app = null;
    app = new Amble.Application(application);

    EDITOR.update();
    EDITOR.refresh();

    ipcRenderer.send('editor-project-loaded');
    Amble.app.imgList = projectData.imgs

});

//move to angular
var projectView = {

    projectStructure: [],

    makeList: function(array) {

        var list = document.createElement("ul");
        list.className = "list";

        for(var i = 0; i < array.length; i++) {
            list.appendChild(this.item(array[i]));
        }

        return list;
    },

    item: function(item) {
        var div = document.createElement("li");

        div.className = "list-item"

        var header = document.createElement('div');
        header.className = 'header';

        var icon = document.createElement("i");

        switch(item.type) {
            case 'folder':

                var arrow = document.createElement("i");
                arrow.className = "glyphicon glyphicon-triangle-right no-clickable triangle icon"
                header.appendChild(arrow);
                icon.className = "glyphicon glyphicon-folder-close no-clickable folder icon"

                break;
            case 'file':

                icon.className = "glyphicon glyphicon-file no-clickable file icon"

                break;

        }

        header.appendChild(icon);

        var text = document.createElement("a");
        text.href = "#"
        text.className = 'list-item';
        text.innerHTML = item.name;
        text.addEventListener('click', this.itemOnClick, false);

        header.appendChild(text);
        div.appendChild(header);

        if(item.childs.length > 0) {
            div.appendChild(this.makeList(item.childs));
        }

        return div;
    },

    itemOnClick: function(e) {
        e.preventDefault();

        //if file else collapse/expand directory

        var normal = 'header';
        var highlighted = "header highlighted";

        var parent = e.target.parentElement;

        if(parent.className == normal) {
            parent.className = highlighted;
        } else {
            parent.className = normal;
        }

    },

    processDir: function(path) {

        var files = [];

        var abc = fs.readdirSync(path)

        for(var i = 0; i < abc.length; i++) {

            var file = {
                type: fs.lstatSync(path + '/' + abc[i]).isDirectory() ? 'folder': 'file',
                path: path + '/' + abc[i],
                name: abc[i],
                childs: []
            }

            if(file.type == 'folder') {
                file.childs = this.processDir(path + '/' + abc[i]);
            } else {
                var f = abc[i].split('.');
                var extension = f[f.length - 1];
                for(var x in imgExtensionList) {
                    if(extension == imgExtensionList[x]) {
                        projectData.imgs.push({
                            path: path + '/' + abc[i],
                            name: abc[i]
                        })
                        break;
                    } else if(extension == 'js') {
                        projectData.scripts.push({
                            path: path + '/' + abc[i],
                            name: abc[i]
                        });
                        break;
                    }
                }
            }

            files.push(file)
        }

        return files;

    },

    watch: function(){

        watch(projectDirectory + '/assets', function(filename){

            projectData.scripts = [];
            projectData.imgs = [];

            projectView.projectStructure = projectView.processDir(projectDirectory + '/assets');

            var list = document.getElementById("list");
            list.innerHTML = "";

            for(var i = 0; i < projectView.projectStructure.length; i++) {
                list.appendChild(projectView.item(projectView.projectStructure[i]));
            }

            for(var i in projectData.scripts) {
                require.reload(projectData.scripts[i].path);
            }

            EDITOR.updateClass();

            Amble.app.imgList = projectData.imgs
            // document.querySelector('renderer-component').sprites = projectData.imgs;
        });

    },

    init: function(){

        this.projectStructure = this.processDir(projectDirectory + '/assets');

        var list = document.getElementById("list");
        for(var i = 0; i < this.projectStructure.length; i++) {
            list.appendChild(this.item(this.projectStructure[i]));
        }

        this.watch();

    }
}

var ambleEditor = angular.module('ambleEditor', []);
ambleEditor.controller('editorController', ['$scope', function($scope) {

    var editor = EDITOR = this;
    editor.actors = [];

    editor.refresh = function() {
        $scope.$apply();
    };

    editor.updateActors = function() {
        editor.actors = Amble.app.scene.children.filter(c => c.options.hideInHierarchy != true);
    };

    editor.update = function() {

        this.logs = Amble.app.debug.logs;
        this.hierarchy = {};
        this.inspector = {};
        this.inspector.transformShow = true;
        this.previousActor = null;
        this.sceneID = null;
        this.actor = null;

        //default components to add
        this.componentsToAdd = [
            {
                name: 'SpriteRenderer',
                type: 'renderer',
                body: { name: 'Amble.Graphics.SpriteRenderer', args: {
                    sprite: ''
                }}
            },
            {
                name: 'RectRenderer',
                type: 'renderer',
                body: { name: 'Amble.Graphics.RectRenderer', args: {
                    color: '#1B5E20',
                    size: { name: "Amble.Math.Vector2", args: {x:100 ,y:100}},
                    layer: 0
                }}
            },
            {
                name: 'AnimationRenderer',
                type: 'renderer',
                body: { name: 'Amble.Graphics.AnimationRenderer', args: {
                    sprite: '',
                    frames: 1,
                    updatesPerFrame: 1,
                    layer: 0
                }}
            }
        ];

        //default actors type to add
        this.actorsToAdd = [
            {
                name: 'actor',
                tag: ['actor'],
                options: {},
                selected: false,
                transform: { name: "Amble.Transform", args: {
                    position: { name: "Amble.Math.Vector2", args: {x:0 ,y:0}},
                    scale: { name: "Amble.Math.Vector2", args: {x:1 ,y:1}},
                    rotation: 0
                }},
                renderer: { name: 'Amble.Graphics.EngineRenderer', args: {}},
                components: []
            }
        ];

        var cam = Amble.app.scene.getActorByName('SceneCamera');
        if(cam) {
            var cameraScript = cam.getComponent('Camera');
            cameraScript.editor = this;
        }

        editor.updateActors();
        editor.updateClass();
    };

    editor.updateClass = function() {

        for(var i in editor.actors) {
            var a = editor.actors[i].prefab;
            for(var j in a.components) {
                var c = Amble._classes.find(c => c.name == a.components[j].name);
                if(!c) continue;
                for(var x in c.properties) {
                    if(!a.components[j].properties[x]) {
                        var p = JSON.stringify(c.properties[x])
                        a.components[j].properties[x] = JSON.parse(p);
                    }
                }

                var toDel = [];
                for(var x in a.components[j].properties) {
                    var aa = c.properties.find(s => s.name == a.components[j].properties[x].name);
                    if(!aa) {
                        toDel.push(a.components[j].properties[x].name);
                    }
                }

                for(var x in toDel) {
                    var index = a.components[j].properties.indexOf(a.components[j].properties.find(s => s.name == toDel[x]));
                    a.components[j].properties.splice(index, 1);
                }

                // console.log(a.components[j].properties);
            }
        }
    };

    editor.update();

    angular.element(window).on('keydown', function(e) {
        // console.log(e.which);
        switch(e.which) {
            case 27: //esc

                editor.refresh();

                if(editor.actor && editor.actor.selected) {
                    editor.actor.selected = false;
                }

                if(editor.previousActor) {
                    editor.previousActor.className = 'hierarchy-item';
                }

            break;
            case 46: //del

                if(editor.actor) {

                    Amble.app.scene.remove(editor.actor)

                    editor.actors = Amble.app.scene.children.filter(c => c.options.hideInHierarchy != true);
                    editor.actor = null;

                    editor.refresh();
                }

            break;
            case 70: // f

                if(e.shiftKey && editor.actor.transform) {
                    Amble.app.mainCamera.camera.position.x = editor.actor.transform.position.x;
                    Amble.app.mainCamera.camera.position.y = editor.actor.transform.position.y;
                }

            break;

        }
    });

    editor.updateComponents = function() {
        //updated componentsToAdd
        for(var i in Amble._classes) {
            var p = Amble._classes[i].properties
            console.log(p);
            var cl = {
                name: Amble._classes[i].name,
                options: Amble._classes[i]._options,
                type: 'class',
                body: {
                    type: 'noneditor',
                    name: Amble._classes[i].name,
                    properties: p
                }
            }
            var c = this.componentsToAdd.find(c => c.name == cl.name)
            if(!c) {
                this.componentsToAdd.push(cl);
            } else {
                c.body.properties = Amble._classes[i].properties
            }
        }

        console.log(this.componentsToAdd);

    };

    editor.addComponent = function(component, $e) {
        console.log(component);

        if(editor.actor) {
            //add to prefab
            if(component.type == 'renderer') {
                editor.actor.prefab.renderer = component.body;
            } else if(component.type == 'class'){
                console.log(editor.actor.prefab);
                editor.actor.prefab.components.push(component.body);
            }

            var sceneID = editor.actor.sceneID;
            var prefab = editor.actor.prefab;

            Amble.app.scene.remove(this.actor);
            editor.actor = Amble.app.scene.instantiate(prefab);

            editor.actor.selected = true;
            editor.actor.sceneID = sceneID;
        }

    };

    editor.addActor = function(actor) {

        var a = JSON.parse(JSON.stringify(this.actorsToAdd.find(a => a.name == actor.name)));
        if(a) {
            delete a.$$hashKey;
            a.name += editor.actors.length;
            Amble.app.scene.instantiate(a);
        }

        console.log(Amble.app.scene.children)
        editor.actors = Amble.app.scene.children.filter(c => c.options.hideInHierarchy != true);
    };

    editor.actorSelected = function(_actor, $e) {

        if(editor.actor) {
            editor.actor.selected = false;
        }

        editor.sceneID = _actor.sceneID;

        editor.actor = Amble.app.scene.getActorByID(_actor.sceneID);

        var normal = 'hierarchy-item';
        var highlighted = "hierarchy-item highlighted";

        if(editor.previousActor) {
            editor.previousActor.className = normal;
        }

        if($e) {
            $e.preventDefault();
            $e.target.className = highlighted;
            editor.previousActor = $e.target;
        }

        if(editor.actor.selected) {
            editor.actor.selected = false;
        } else {
            editor.actor.selected = true;
        }
    };
}]);

//scane view
var application = {

    resize: true,

    sceneCamera: {
        name: 'SceneCamera',
        tag: ['sceneCamera'],
        options: {
            hideInHierarchy: true
        },
        camera: { name: "Amble.Camera", args: {
            position: { name: "Amble.Math.Vector2", args: {x:0 ,y:0}},
            context: "scene-view"
        }},
        components: [
            { type:'editor', name: "Camera", args: {}}
        ]
    },

    preload: function(){

        //load actors to scene
        for(var i in projectData.actors) {
            console.log(projectData.actors[i])
            this.scene.instantiate(projectData.actors[i]);
            EDITOR.updateActors();
        }

        // load imgs
        if(projectData.imgs) {
            for(var i in projectData.imgs) {
                this.loader.load('img', projectData.imgs[i].path, projectData.imgs[i].name);
            }
        }

    },

    //process scripts int engine and load objects
    loaded: function(){

        if(projectData.camera) {
            this.mainCamera.camera.position.x = projectData.camera.x;
            this.mainCamera.camera.position.y = projectData.camera.y;
        }

    },

    //actual start function
    start: function(){

    },

    preupdate: function(){

    },

    postupdate: function(){

    },

    postrender: function(){

    }
};

var app = new Amble.Application({});

/**
 * Removes a module from the cache.
 */
require.uncache = function (moduleName) {
    // Run over the cache looking for the files
    // loaded by the specified module name
    require.searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });
};

/**
 * Runs over the cache to search for all the cached files.
 */
require.searchCache = function (moduleName, callback) {
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        (function run(mod) {
            // Go over each of the module's children and
            // run over it
            mod.children.forEach(function (child) {
                run(child);
            });

            // Call the specified callback providing the
            // found module
            callback(mod);
        })(mod);
    }
};

/*
 * Load a module, clearing it from the cache if necessary.
 */
require.reload = function(moduleName) {
    require.uncache(moduleName);
    return require(moduleName);
};
