// Which constellation is in focus, with smooth cross-fades between them.
export class FocusState {
  constructor() {
    this.focus = -1;
    this.focusAmt = 0;
    this.prev = -1;
    this.prevAmt = 0;
    this.dim = 0;
    this.showAll = 0;
    this.showAllTarget = 0;
  }

  setFocus(index) {
    if (index === this.focus) return;
    if (this.focus >= 0) {
      this.prev = this.focus;
      this.prevAmt = this.focusAmt;
    }
    this.focus = index;
    this.focusAmt = 0;
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 4);
    this.focusAmt += ((this.focus >= 0 ? 1 : 0) - this.focusAmt) * k;
    this.prevAmt += (0 - this.prevAmt) * k;
    this.dim += ((this.focus >= 0 ? 1 : 0) - this.dim) * k;
    this.showAll += (this.showAllTarget - this.showAll) * k;
    if (this.prevAmt < 0.002) this.prev = -1;
  }

  apply(uniforms) {
    uniforms.uFocus.value = this.focus;
    uniforms.uFocusAmt.value = this.focusAmt;
    uniforms.uPrev.value = this.prev;
    uniforms.uPrevAmt.value = this.prevAmt;
    if (uniforms.uDim) uniforms.uDim.value = this.dim;
    if (uniforms.uShowAll) uniforms.uShowAll.value = this.showAll;
  }
}

export const focusGLSL = /* glsl */ `
  uniform float uFocus;
  uniform float uFocusAmt;
  uniform float uPrev;
  uniform float uPrevAmt;
  float focusAmount(float con) {
    float a = (1.0 - step(0.5, abs(con - uFocus))) * uFocusAmt;
    float b = (1.0 - step(0.5, abs(con - uPrev))) * uPrevAmt;
    return clamp(a + b, 0.0, 1.0);
  }
`;

export const focusUniforms = () => ({
  uFocus: { value: -1 },
  uFocusAmt: { value: 0 },
  uPrev: { value: -1 },
  uPrevAmt: { value: 0 },
});
