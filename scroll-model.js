class ScrollModel extends HTMLElement {
  constructor() {
    super();
    this._mv = null;
    this._frames = {};
    this._onScroll = this._onScroll.bind(this);
  }

  connectedCallback() {
    // Create model-viewer
    this._mv = document.createElement("model-viewer");

    // Copy all attributes EXCEPT *-frames
    for (const attr of this.attributes) {
      if (!attr.name.endsWith("-frames")) {
        this._mv.setAttribute(attr.name, attr.value);
      }
    }

    // Style so it shows
    this._mv.style.width = "100%";
    this._mv.style.height = "100%";
    this._mv.style.display = "block";

    this.appendChild(this._mv);

    // Parse frame attributes
    this._frames.rotation = this._parseFrames("rotation-frames");
    this._frames.position = this._parseFrames("position-frames");
    this._frames.scale = this._parseFrames("scale-frames");

    window.addEventListener("scroll", this._onScroll);
    
    // Wait for model-viewer to be ready before initial update
    this._mv.addEventListener('load', () => {
      this._onScroll();
    });
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this._onScroll);
  }

  /* ----------------------------- */

  _parseFrames(name) {
    const attr = this.getAttribute(name);
    if (!attr) return null;

    return attr
      .split(";")
      .map(f => f.trim())
      .filter(Boolean)
      .map(f => {
        const [k, v] = f.split(":");
        return {
          t: parseFloat(k),
          v: v.split(",").map(Number)
        };
      })
      .sort((a, b) => a.t - b.t);
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _interp(frames, p) {
    if (!frames || frames.length === 0) return null;
    if (p <= frames[0].t) return frames[0].v;
    if (p >= frames.at(-1).t) return frames.at(-1).v;

    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i];
      const b = frames[i + 1];
      if (p >= a.t && p <= b.t) {
        const t = (p - a.t) / (b.t - a.t);
        return a.v.map((v, j) => this._lerp(v, b.v[j], t));
      }
    }
  }

  _onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;

    /* ROTATION - using orientation for actual model rotation */
    const r = this._interp(this._frames.rotation, p);
    if (r) {
      // Convert degrees to radians and set orientation (X, Y, Z in radians)
      const rad = r.map(d => (d * Math.PI) / 180);
      this._mv.orientation = `${rad[0]}rad ${rad[1]}rad ${rad[2]}rad`;
    }

    /* POSITION - using cameraTarget */
    const pos = this._interp(this._frames.position, p);
    if (pos) {
      this._mv.cameraTarget = `${pos[0]}m ${pos[1]}m ${pos[2]}m`;
    }

    /* SCALE */
    const s = this._interp(this._frames.scale, p);
    if (s) {
      this._mv.scale = `${s[0]} ${s[1]} ${s[2]}`;
    }
  }
}

customElements.define("scroll-model", ScrollModel);
