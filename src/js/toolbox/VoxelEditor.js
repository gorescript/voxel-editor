import RotationControls from "../core/RotationControls";
import VoxelMeshManager from "../core/VoxelMeshManager";
import ColorPicker from "./ColorPicker";

function VoxelEditor() {
	this.canvasInfo = {};
	this.actionLog = [];
	this.selected = [];
	this.init();
}

VoxelEditor.prototype = {
	init: function() {
		var that = this;

		$(document).on("contextmenu", function(){
			return false;
		});

		this.canvasContainer = document.getElementById("canvas-container");
		this.menuContainer = document.getElementById("menu-container");

		this.calculateSizes();

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setClearColor(0xffffff, 1);
		this.renderer.setSize(this.canvasInfo.width, this.canvasInfo.height);
		this.renderer.domElement.id = "voxel-canvas";
		$(this.canvasContainer).append(this.renderer.domElement);

		this.canvasInfo.maxAnisotropy = this.renderer.getMaxAnisotropy();

		this.camera = new THREE.PerspectiveCamera(90, this.canvasInfo.width / this.canvasInfo.height, 0.1, 1000);
		this.scene = new THREE.Scene();

		this.initComponents();

		window.addEventListener("resize", function() { that.onResize(); }, false);
		this.onResize();

		$(this.canvasContainer).show();
		$(this.menuContainer).css("display", "block");

		this.initMenuControls();

		$("#voxel-mesh-name").val(that.voxelMeshManager.name);

		this.draw();
	},

	initComponents: function() {
		this.voxelMeshManager = new VoxelMeshManager(this.canvasInfo, this.renderer, this.scene, this.camera);
		this.voxelMeshManager.init();

		this.controls = new RotationControls(this.camera);
		this.controls.isRotating = false;
		this.controls.zoomSpeed = 1;
		this.controls.distance = 8;
		this.controls.minDistance = 4;
		this.controls.maxDistance = 32;
		this.controls.canvasSelector = "#voxel-canvas";

		this.controls.init();
	},

	initMenuControls: function() {
		var that = this;

		var $voxelCount = $("#voxel-count");
		$voxelCount.text(this.voxelMeshManager.getVoxelCount());
		this.voxelMeshManager.onCountChange = function(e) {
			$voxelCount.text(e.count);
		};

		this.colorPicker = new ColorPicker($("#color-picker-container"), this.voxelMeshManager.colors, this.voxelMeshManager.edgeColors,
			this.voxelMeshManager.glows);
		this.colorPicker.onSelectedIndexChange = function(e) { that.voxelMeshManager.selectedMaterial = e.index; };
		this.colorPicker.addEventListener("colorChange", function() {
			that.voxelMeshManager.updateTexture();
		});

		var $voxelMeshName = $("#voxel-mesh-name");

		var voxelMeshNameError = [
			"invalid voxel mesh name:",
			"only a-z, A-Z, 0-9 and _ are allowed as characters",
			"name must be at least 1 character long",
		].join("\n");

		$voxelMeshName.on("change", function() {
			var name = $(this).val();
			if (that.validateVoxelMeshName(name)) {
				that.voxelMeshManager.name = name;
			} else {
				$(this).val(that.voxelMeshManager.name);
				alert(voxelMeshNameError);
			}
		});

		this.voxelMeshManager.addEventListener("importDone", function() {
			$voxelMeshName.val(that.voxelMeshManager.name);
			that.colorPicker.colors = that.voxelMeshManager.colors;
			that.colorPicker.edgeColors = that.voxelMeshManager.edgeColors;
			that.colorPicker.glows = that.voxelMeshManager.glows;
			that.colorPicker.refresh();
			that.colorPicker.draw();
		});

		$("#button-add-random").click(function() {
			that.voxelMeshManager.addRandomVoxels();
		});

		$("#button-add-cube").click(function() {
			that.voxelMeshManager.addCube();
		});

		$("#button-add-sphere").click(function() {
			that.voxelMeshManager.addSphere();
		});

		$("#button-flip-h").click(function() {
			that.voxelMeshManager.flipHorizontally();
		});

		$("#button-flip-v").click(function() {
			that.voxelMeshManager.flipVertically();
		});

		$("#melt-floor-height").change(function() {
			var n = parseInt($(this).val());
			n = isNaN(n) ? 0 : n;
			n = GS.MathHelper.clamp(n, 0, that.voxelMeshManager.size);
			that.voxelMeshManager.meltFloorHeight = n;
			$(this).val(n);
		});

		$("#button-melt").click(function() {
			that.voxelMeshManager.melt(that.voxelMeshManager.meltFloorHeight);
		});

		$("#field-import").change(function() {
			that.importVoxelMesh();
		});

		$("#button-import").click(function() {
			that.importVoxelMesh();
		});

		$("#button-save").click(function() {
			that.voxelMeshManager.downloadVoxelMesh();
		});

		$("#button-export").click(function() {
			that.voxelMeshManager.exportToOBJ(true);
			that.colorPicker.draw();
		});
	},

	validateVoxelMeshName: function(name) {
		var re = /^[0-9a-zA-Z_]+$/;
		return re.exec(name);
	},

	importVoxelMesh: function() {
		var that = this;

		var $fieldImport = $("#field-import");

		var files = $fieldImport[0].files;
		if (files === undefined || files.length === 0) {
			$fieldImport.trigger("click");
			return;
		}
		var file = files[0];

		var fileReader = new FileReader();
		fileReader.onload = function(e) {
			that.voxelMeshManager.importVoxelMesh(e.target.result);
		};
		fileReader.onerror = function(e) {
			alert("File read error: " + e.target.error.code);
		};
		fileReader.readAsText(file);

		$fieldImport.val("");
	},

	update: function() {
		this.controls.update();
		this.voxelMeshManager.update();

		var $position = $("#position");
		var cursorPosition = this.voxelMeshManager.cursorPosition;
		if (cursorPosition !== undefined) {
			$position.text( "X: " + cursorPosition.x + ", " +
							"Y: " + cursorPosition.y + ", " +
							"Z: " + cursorPosition.z);
		} else {
			$position.text("X: ---, Y: ---, Z: ---");
		}
	},

	draw: function() {
		var that = this;
		this.update();

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(function() { that.draw(); });
	},

	calculateSizes: function() {
		this.minWidth = 1280;
		this.minHeight = 720;

		this.menuWidth = 300;
		this.menuHeight = Math.max(window.innerHeight, this.minHeight);
		this.canvasInfo.width = Math.max(window.innerWidth - this.menuWidth, this.minWidth - this.menuWidth);
		this.canvasInfo.height = Math.max(window.innerHeight, this.minHeight);
	},

	onResize: function() {
		this.calculateSizes();

		this.canvasContainer.width = this.canvasInfo.width + "px";
		this.canvasContainer.height = this.canvasInfo.height + "px";
		this.menuContainer.style.width = this.menuWidth + "px";
		this.menuContainer.style.height = this.menuHeight + "px";
		this.menuContainer.style.marginLeft = this.canvasInfo.width + "px";

		this.camera.aspect = this.canvasInfo.width / this.canvasInfo.height;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(this.canvasInfo.width, this.canvasInfo.height);
	},
};

export default VoxelEditor;