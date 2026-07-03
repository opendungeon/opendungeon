import * as GLM from "gl-matrix";

export default class Camera {
  readonly view: GLM.mat4;
  readonly projection: GLM.mat4;
  private _aspectRatio: number;
  private _zoom: number;

  constructor(aspectRatio: number) {
    this._aspectRatio = aspectRatio;
    this._zoom = 1;

    this.view = GLM.mat4.create();
    GLM.mat4.translate(this.view, this.view, GLM.vec3.fromValues(0, 0, -3));

    this.projection = GLM.mat4.create();
    this.loadProjection();
  }

  get aspectRatio(): number {
    return this._aspectRatio;
  }

  set aspectRatio(aspectRatio: number) {
    this._aspectRatio = aspectRatio;
    this.loadProjection();
  }

  get zoom(): number {
    return this._zoom;
  }

  set zoom(n: number) {
    this._zoom = n;
    this.loadProjection();
  }

  translate(v: GLM.vec3) {
    GLM.mat4.translate(this.view, this.view, v);
  }

  rotateX(radians: number) {
    GLM.mat4.rotateX(this.view, this.view, radians);
  }

  rotateY(radians: number) {
    GLM.mat4.rotateY(this.view, this.view, radians);
  }

  rotateZ(radians: number) {
    GLM.mat4.rotateZ(this.view, this.view, radians);
  }

  private loadProjection() {
    GLM.mat4.ortho(
      this.projection,
      -this._aspectRatio * this._zoom,
      this._aspectRatio * this._zoom,
      -this._zoom,
      this._zoom,
      -1000,
      1000,
    );
  }
}
