var App = App || {}

App.init = function() {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function() {
        // Create scene
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.8, 0.7, 1);

        // Enable physics engine
        var gravityVector = new BABYLON.Vector3(0,-9.81, 0);
        var physicsPlugin = new BABYLON.CannonJSPlugin();
        scene.enablePhysics(gravityVector, physicsPlugin);

        // Generate light
        var light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -3, -1), scene);
        light.position = new BABYLON.Vector3(20, 40, 20);
        light.intensity = 0.8;
    
        var light2 = new BABYLON.SpotLight("spot02", new BABYLON.Vector3(30, 40, 20),
                                                    new BABYLON.Vector3(-1, -2, -1), 1.1, 16, scene);
        light2.intensity = 0.5;
    
        // Prepare information about the ground cubes
        const cubeSize = .5;
        var cubesList = [
            {'x':  -1, 'z': -1.5, 'obj': null},
            {'x': -.5, 'z': -1.5, 'obj': null},
            {'x':   0, 'z': -1.5, 'obj': null},
            {'x':  .5, 'z': -1.5, 'obj': null},
            {'x':   1, 'z': -1.5, 'obj': null},

            {'x':  .5, 'z':   -1, 'obj': null},
            {'x':   1, 'z':   -1, 'obj': null},

            {'x':  -1, 'z':  -.5, 'obj': null},
            {'x': -.5, 'z':  -.5, 'obj': null},
            {'x':   0, 'z':  -.5, 'obj': null},
            {'x':  .5, 'z':  -.5, 'obj': null}, 
            {'x':   1, 'z':  -.5, 'obj': null},
            {'x': 1.5, 'z':  -.5, 'obj': null},

            {'x':  -1, 'z':    0, 'obj': null},
            {'x': -.5, 'z':    0, 'obj': null},
            {'x':   0, 'z':    0, 'obj': null},
            {'x':  .5, 'z':    0, 'obj': null},
            {'x':   1, 'z':    0, 'obj': null},
            {'x': 1.5, 'z':    0, 'obj': null},

            {'x': -.5, 'z':   .5, 'obj': null},
            {'x':   0, 'z':   .5, 'obj': null},
            {'x':  .5, 'z':   .5, 'obj': null},
            {'x':   1, 'z':   .5, 'obj': null},
            {'x': 1.5, 'z':   .5, 'obj': null},
        ];
        var cubeY = 0;
        var destination = {
            'x': 0,
            'z': 0,
        }

        // Create ground cubes
        cubesList.forEach(function(cube, i) {
            cube.obj = BABYLON.MeshBuilder.CreateBox("box", {height: cubeSize, width: cubeSize, depth: cubeSize}, scene);
            cube.obj.position = new BABYLON.Vector3(cube.x, cubeY, cube.z);

            // Mark destination cube
            if (cube.x == destination.x && cube.z == destination.z) {
                var material = new BABYLON.StandardMaterial(scene);
                material.alpha = 1;
                material.diffuseColor = new BABYLON.Color3(.7, .2, .2);
                cube.obj.material = material;
            }
        });

        // Create player
        var player = BABYLON.MeshBuilder.CreateBox("box", {height: cubeSize*5, width: cubeSize, depth: cubeSize}, scene);
        player.position = new BABYLON.Vector3(-1, 1+cubeSize, -1.5);

        // Create player material
        var material = new BABYLON.StandardMaterial(scene);
        material.alpha = 1;
        material.diffuseColor = new BABYLON.Color3(.3, .2, .7);
        player.material = material;

        // Prepare score variable
        var score = 0;

        // var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        // shadowGenerator.addShadowCaster(player);
        // // shadowGenerator.useExponentialShadowMap = true;
        // shadowGenerator.useBlurExponentialShadowMap = true;
        // shadowGenerator.blurScale = 15;

        // Create camera
        var camera = new BABYLON.TargetCamera("camera", new BABYLON.Vector3(5, 20, -5), scene);
        camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoTop = 5;
        camera.orthoBottom = -5;
        camera.orthoLeft = -5;
        camera.orthoRight = 5;
        camera.setTarget(new BABYLON.Vector3(0, 0, 0));

        // GUI
        var gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        gui.isForeground = true;

        var guiText = new BABYLON.GUI.TextBlock();
        guiText.text = "Reach destination after clearing all tiles";
        guiText.color = "white";
        guiText.outlineColor = "grey";
        guiText.fontSize = 24;
        guiText.paddingTop = "2%";
        guiText.paddingRight = "2%";
        guiText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        guiText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        gui.addControl(guiText);

        var guiText2 = new BABYLON.GUI.TextBlock();
        guiText2.text = "WSAD or arrow keys to move, R to restart";
        guiText2.color = "white";
        guiText2.outlineColor = "grey";
        guiText2.fontSize = 20;
        guiText2.paddingTop = "5%";
        guiText2.paddingRight = "2%";
        guiText2.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        guiText2.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        gui.addControl(guiText2);

        // Setup input event observers
        var inputMap = {};
        var buttonIsPressed = false;
        scene.actionManager = new BABYLON.ActionManager(scene);
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {								
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {								
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
            buttonIsPressed = false;
        }));

        // Check if a ground cube exists in the given direction
        function isDirectionValid(player, dir, step) {
            var targetPos = new BABYLON.Vector3(player.position.x, player.position.y, player.position.z);
            if (dir == 'up') targetPos.z += step;
            else if (dir == 'down')  targetPos.z -= step;
            else if (dir == 'right') targetPos.x += step;
            else if (dir == 'left')  targetPos.x -= step;

            var cube;
            for (var i = 0; i < cubesList.length; ++i) {
                cube = cubesList[i];
                if (cube.obj != null && cube.x == targetPos.x && cube.z == targetPos.z)
                    return true;
            }
            return false;
        }

        // Move the player in the given direction and destroy previous ground cube
        function movePlayer(player, dir, step) {
            var cube;
            for (var i = 0; i < cubesList.length; ++i) {
                cube = cubesList[i];
                if (cube.obj != null && cube.x == player.position.x && cube.z == player.position.z) {
                    cube.obj.physicsImpostor = new BABYLON.PhysicsImpostor(cube.obj, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.0, restitution: 0.3 }, scene);     
                    cube.obj = null;
                    break;
                }
            }
            
            if (dir == 'up') player.position.z += step;
            else if (dir == 'down')  player.position.z -= step;
            else if (dir == 'right') player.position.x += step;
            else if (dir == 'left')  player.position.x -= step;

            ++score;

            checkForDestination(player);
        }

        // Check if player reached destination
        function checkForDestination(player) {
            if (player.position.x == destination.z && player.position.z == destination.z) {
                console.log('destination reached');

                var gameOverGui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("GameOverUI");
                gameOverGui.background = "lightgrey";
                gameOverGui.isForeground = true;
        
                var text1 = new BABYLON.GUI.TextBlock();
                text1.text = "Press button to restart";
                text1.color = "white";
                text1.outlineWidth = 1;
                text1.outlineColor = "grey";
                text1.fontSize = 48;
                text1.paddingTop = "25%";
                text1.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
                gameOverGui.addControl(text1);
        
                var button1 = BABYLON.GUI.Button.CreateSimpleButton("btn1", "Restart");
                button1.width = "150px"
                button1.height = "40px";
                button1.color = "white";
                button1.cornerRadius = 20;
                button1.background = "green";
                button1.onPointerUpObservable.add(function() {
                    document.location.reload();
                });
                gameOverGui.addControl(button1);

                if (score == cubesList.length - 1) {
                    gameOverGui.background = "Teal";
                    text1.text = "Congratulations!";
                } else {
                    text1.text = "Not all tiles cleared...";
                }

            }
        }

        // Listen for input events
        const step = cubeSize;
        scene.onBeforeRenderObservable.add(() => {
            if (!buttonIsPressed && (inputMap["w"] || inputMap["ArrowUp"])) {
                if (isDirectionValid(player, 'up', step))
                    movePlayer(player, 'up', step);
                buttonIsPressed = true;
            }
            if (!buttonIsPressed && (inputMap["s"] || inputMap["ArrowDown"])) {
                if (isDirectionValid(player, 'down', step))
                movePlayer(player, 'down', step);
                buttonIsPressed = true;
            }
            if (!buttonIsPressed && (inputMap["d"] || inputMap["ArrowRight"])) {
                if (isDirectionValid(player, 'right', step))
                movePlayer(player, 'right', step);
                buttonIsPressed = true;
            }
            if (!buttonIsPressed && (inputMap["a"] || inputMap["ArrowLeft"])) {
                if (isDirectionValid(player, 'left', step))
                    movePlayer(player, 'left', step);
                buttonIsPressed = true;
            }
            if (inputMap["r"]) {
                document.location.reload();
            }
        })   

        return scene;
    };

    var scene = createScene();
    engine.runRenderLoop(function() {
        scene.render();
    });
}