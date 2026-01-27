(() => {
  const Ed = Object.create;
  const rn = Object.defineProperty;
  const Ad = Object.getOwnPropertyDescriptor;
  const Cd = Object.getOwnPropertyNames;
  const Td = Object.getPrototypeOf;
  const Id = Object.prototype.hasOwnProperty;
  const d = (o, e) => () => (o && (e = o((o = 0))), e);
  const nn = (o, e) => () => (
    e || o((e = { exports: {} }).exports, e),
    e.exports
  );
  const Sd = (o, e, t, r) => {
    if ((e && typeof e === "object") || typeof e === "function")
      for (const i of Cd(e))
        !Id.call(o, i) &&
          i !== t &&
          rn(o, i, {
            get: () => e[i],
            enumerable: !(r = Ad(e, i)) || r.enumerable,
          });
    return o;
  };
  const $d = (o, e, t) => (
    (t = o != null ? Ed(Td(o)) : {}),
    Sd(
      e || !o || !o.__esModule
        ? rn(t, "default", { value: o, enumerable: !0 })
        : t,
      o,
    )
  );
  function a(o, e, t, r) {
    const i = arguments.length;
    let n =
      i < 3 ? e : r === null ? (r = Object.getOwnPropertyDescriptor(e, t)) : r;
    let s;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      n = Reflect.decorate(o, e, t, r);
    else
      for (let l = o.length - 1; l >= 0; l--)
        (s = o[l]) && (n = (i < 3 ? s(n) : i > 3 ? s(e, t, n) : s(e, t)) || n);
    return (i > 3 && n && Object.defineProperty(e, t, n), n);
  }
  const T = d(() => {});
  let C;
  const sn = d(() => {
    C = (o) => (e, t) => {
      t !== void 0
        ? t.addInitializer(() => {
            customElements.define(o, e);
          })
        : customElements.define(o, e);
    };
  });
  let no;
  let so;
  let Ar;
  let an;
  let Tt;
  let ln;
  let x;
  let dn;
  let Cr;
  const Tr = d(() => {
    ((no = globalThis),
      (so =
        no.ShadowRoot &&
        (no.ShadyCSS === void 0 || no.ShadyCSS.nativeShadow) &&
        "adoptedStyleSheets" in Document.prototype &&
        "replace" in CSSStyleSheet.prototype),
      (Ar = Symbol()),
      (an = new WeakMap()),
      (Tt = class {
        constructor(e, t, r) {
          if (((this._$cssResult$ = !0), r !== Ar))
            throw Error(
              "CSSResult is not constructable. Use `unsafeCSS` or `css` instead.",
            );
          ((this.cssText = e), (this.t = t));
        }

        get styleSheet() {
          let e = this.o;
          const { t } = this;
          if (so && e === void 0) {
            const r = t !== void 0 && t.length === 1;
            (r && (e = an.get(t)),
              e === void 0 &&
                ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText),
                r && an.set(t, e)));
          }
          return e;
        }

        toString() {
          return this.cssText;
        }
      }),
      (ln = (o) => new Tt(typeof o === "string" ? o : `${o}`, void 0, Ar)),
      (x = (o, ...e) => {
        const t =
          o.length === 1
            ? o[0]
            : e.reduce(
                (r, i, n) =>
                  r +
                  ((s) => {
                    if (s._$cssResult$ === !0) return s.cssText;
                    if (typeof s === "number") return s;
                    throw Error(
                      `Value passed to 'css' function must be a 'css' function result: ${
                        s
                      }. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`,
                    );
                  })(i) +
                  o[n + 1],
                o[0],
              );
        return new Tt(t, o, Ar);
      }),
      (dn = (o, e) => {
        if (so)
          o.adoptedStyleSheets = e.map((t) =>
            t instanceof CSSStyleSheet ? t : t.styleSheet,
          );
        else
          for (const t of e) {
            const r = document.createElement("style");
            const i = no.litNonce;
            (i !== void 0 && r.setAttribute("nonce", i),
              (r.textContent = t.cssText),
              o.appendChild(r));
          }
      }),
      (Cr = so
        ? (o) => o
        : (o) =>
            o instanceof CSSStyleSheet
              ? ((e) => {
                  let t = "";
                  for (const r of e.cssRules) t += r.cssText;
                  return ln(t);
                })(o)
              : o));
  });
  let Rd;
  let Od;
  let Pd;
  let kd;
  let Ld;
  let Md;
  let Re;
  let cn;
  let Dd;
  let zd;
  let It;
  let St;
  let ao;
  let pn;
  let _e;
  const $t = d(() => {
    Tr();
    Tr();
    (({
      is: Rd,
      defineProperty: Od,
      getOwnPropertyDescriptor: Pd,
      getOwnPropertyNames: kd,
      getOwnPropertySymbols: Ld,
      getPrototypeOf: Md,
    } = Object),
      (Re = globalThis),
      (cn = Re.trustedTypes),
      (Dd = cn ? cn.emptyScript : ""),
      (zd = Re.reactiveElementPolyfillSupport),
      (It = (o, e) => o),
      (St = {
        toAttribute(o, e) {
          switch (e) {
            case Boolean:
              o = o ? Dd : null;
              break;
            case Object:
            case Array:
              o = o == null ? o : JSON.stringify(o);
          }
          return o;
        },
        fromAttribute(o, e) {
          let t = o;
          switch (e) {
            case Boolean:
              t = o !== null;
              break;
            case Number:
              t = o === null ? null : Number(o);
              break;
            case Object:
            case Array:
              try {
                t = JSON.parse(o);
              } catch {
                t = null;
              }
          }
          return t;
        },
      }),
      (ao = (o, e) => !Rd(o, e)),
      (pn = {
        attribute: !0,
        type: String,
        converter: St,
        reflect: !1,
        useDefault: !1,
        hasChanged: ao,
      }));
    (Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")),
      Re.litPropertyMetadata ?? (Re.litPropertyMetadata = new WeakMap()));
    _e = class extends HTMLElement {
      static addInitializer(e) {
        (this._$Ei(), (this.l ?? (this.l = [])).push(e));
      }

      static get observedAttributes() {
        return (this.finalize(), this._$Eh && [...this._$Eh.keys()]);
      }

      static createProperty(e, t = pn) {
        if (
          (t.state && (t.attribute = !1),
          this._$Ei(),
          this.prototype.hasOwnProperty(e) &&
            ((t = Object.create(t)).wrapped = !0),
          this.elementProperties.set(e, t),
          !t.noAccessor)
        ) {
          const r = Symbol();
          const i = this.getPropertyDescriptor(e, r, t);
          i !== void 0 && Od(this.prototype, e, i);
        }
      }

      static getPropertyDescriptor(e, t, r) {
        const { get: i, set: n } = Pd(this.prototype, e) ?? {
          get() {
            return this[t];
          },
          set(s) {
            this[t] = s;
          },
        };
        return {
          get: i,
          set(s) {
            const l = i?.call(this);
            (n?.call(this, s), this.requestUpdate(e, l, r));
          },
          configurable: !0,
          enumerable: !0,
        };
      }

      static getPropertyOptions(e) {
        return this.elementProperties.get(e) ?? pn;
      }

      static _$Ei() {
        if (this.hasOwnProperty(It("elementProperties"))) return;
        const e = Md(this);
        (e.finalize(),
          e.l !== void 0 && (this.l = [...e.l]),
          (this.elementProperties = new Map(e.elementProperties)));
      }

      static finalize() {
        if (this.hasOwnProperty(It("finalized"))) return;
        if (
          ((this.finalized = !0),
          this._$Ei(),
          this.hasOwnProperty(It("properties")))
        ) {
          const t = this.properties;
          const r = [...kd(t), ...Ld(t)];
          for (const i of r) this.createProperty(i, t[i]);
        }
        const e = this[Symbol.metadata];
        if (e !== null) {
          const t = litPropertyMetadata.get(e);
          if (t !== void 0)
            for (const [r, i] of t) this.elementProperties.set(r, i);
        }
        this._$Eh = new Map();
        for (const [t, r] of this.elementProperties) {
          const i = this._$Eu(t, r);
          i !== void 0 && this._$Eh.set(i, t);
        }
        this.elementStyles = this.finalizeStyles(this.styles);
      }

      static finalizeStyles(e) {
        const t = [];
        if (Array.isArray(e)) {
          const r = new Set(e.flat(1 / 0).reverse());
          for (const i of r) t.unshift(Cr(i));
        } else e !== void 0 && t.push(Cr(e));
        return t;
      }

      static _$Eu(e, t) {
        const r = t.attribute;
        return r === !1
          ? void 0
          : typeof r === "string"
            ? r
            : typeof e === "string"
              ? e.toLowerCase()
              : void 0;
      }

      constructor() {
        (super(),
          (this._$Ep = void 0),
          (this.isUpdatePending = !1),
          (this.hasUpdated = !1),
          (this._$Em = null),
          this._$Ev());
      }

      _$Ev() {
        ((this._$ES = new Promise((e) => (this.enableUpdating = e))),
          (this._$AL = new Map()),
          this._$E_(),
          this.requestUpdate(),
          this.constructor.l?.forEach((e) => e(this)));
      }

      addController(e) {
        ((this._$EO ?? (this._$EO = new Set())).add(e),
          this.renderRoot !== void 0 &&
            this.isConnected &&
            e.hostConnected?.());
      }

      removeController(e) {
        this._$EO?.delete(e);
      }

      _$E_() {
        const e = new Map();
        const t = this.constructor.elementProperties;
        for (const r of t.keys())
          this.hasOwnProperty(r) && (e.set(r, this[r]), delete this[r]);
        e.size > 0 && (this._$Ep = e);
      }

      createRenderRoot() {
        const e =
          this.shadowRoot ??
          this.attachShadow(this.constructor.shadowRootOptions);
        return (dn(e, this.constructor.elementStyles), e);
      }

      connectedCallback() {
        (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()),
          this.enableUpdating(!0),
          this._$EO?.forEach((e) => e.hostConnected?.()));
      }

      enableUpdating(e) {}

      disconnectedCallback() {
        this._$EO?.forEach((e) => e.hostDisconnected?.());
      }

      attributeChangedCallback(e, t, r) {
        this._$AK(e, r);
      }

      _$ET(e, t) {
        const r = this.constructor.elementProperties.get(e);
        const i = this.constructor._$Eu(e, r);
        if (i !== void 0 && r.reflect === !0) {
          const n = (
            r.converter?.toAttribute !== void 0 ? r.converter : St
          ).toAttribute(t, r.type);
          ((this._$Em = e),
            n == null ? this.removeAttribute(i) : this.setAttribute(i, n),
            (this._$Em = null));
        }
      }

      _$AK(e, t) {
        const r = this.constructor;
        const i = r._$Eh.get(e);
        if (i !== void 0 && this._$Em !== i) {
          const n = r.getPropertyOptions(i);
          const s =
            typeof n.converter === "function"
              ? { fromAttribute: n.converter }
              : n.converter?.fromAttribute !== void 0
                ? n.converter
                : St;
          this._$Em = i;
          const l = s.fromAttribute(t, n.type);
          ((this[i] = l ?? this._$Ej?.get(i) ?? l), (this._$Em = null));
        }
      }

      requestUpdate(e, t, r, i = !1, n) {
        if (e !== void 0) {
          const s = this.constructor;
          if (
            (i === !1 && (n = this[e]),
            r ?? (r = s.getPropertyOptions(e)),
            !(
              (r.hasChanged ?? ao)(n, t) ||
              (r.useDefault &&
                r.reflect &&
                n === this._$Ej?.get(e) &&
                !this.hasAttribute(s._$Eu(e, r)))
            ))
          )
            return;
          this.C(e, t, r);
        }
        this.isUpdatePending === !1 && (this._$ES = this._$EP());
      }

      C(e, t, { useDefault: r, reflect: i, wrapped: n }, s) {
        (r &&
          !(this._$Ej ?? (this._$Ej = new Map())).has(e) &&
          (this._$Ej.set(e, s ?? t ?? this[e]), n !== !0 || s !== void 0)) ||
          (this._$AL.has(e) ||
            (this.hasUpdated || r || (t = void 0), this._$AL.set(e, t)),
          i === !0 &&
            this._$Em !== e &&
            (this._$Eq ?? (this._$Eq = new Set())).add(e));
      }

      async _$EP() {
        this.isUpdatePending = !0;
        try {
          await this._$ES;
        } catch (t) {
          Promise.reject(t);
        }
        const e = this.scheduleUpdate();
        return (e != null && (await e), !this.isUpdatePending);
      }

      scheduleUpdate() {
        return this.performUpdate();
      }

      performUpdate() {
        if (!this.isUpdatePending) return;
        if (!this.hasUpdated) {
          if (
            (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()),
            this._$Ep)
          ) {
            for (const [i, n] of this._$Ep) this[i] = n;
            this._$Ep = void 0;
          }
          const r = this.constructor.elementProperties;
          if (r.size > 0)
            for (const [i, n] of r) {
              const { wrapped: s } = n;
              const l = this[i];
              s !== !0 ||
                this._$AL.has(i) ||
                l === void 0 ||
                this.C(i, void 0, n, l);
            }
        }
        let e = !1;
        const t = this._$AL;
        try {
          ((e = this.shouldUpdate(t)),
            e
              ? (this.willUpdate(t),
                this._$EO?.forEach((r) => r.hostUpdate?.()),
                this.update(t))
              : this._$EM());
        } catch (r) {
          throw ((e = !1), this._$EM(), r);
        }
        e && this._$AE(t);
      }

      willUpdate(e) {}

      _$AE(e) {
        (this._$EO?.forEach((t) => t.hostUpdated?.()),
          this.hasUpdated || ((this.hasUpdated = !0), this.firstUpdated(e)),
          this.updated(e));
      }

      _$EM() {
        ((this._$AL = new Map()), (this.isUpdatePending = !1));
      }

      get updateComplete() {
        return this.getUpdateComplete();
      }

      getUpdateComplete() {
        return this._$ES;
      }

      shouldUpdate(e) {
        return !0;
      }

      update(e) {
        (this._$Eq &&
          (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))),
          this._$EM());
      }

      updated(e) {}

      firstUpdated(e) {}
    };
    ((_e.elementStyles = []),
      (_e.shadowRootOptions = { mode: "open" }),
      (_e[It("elementProperties")] = new Map()),
      (_e[It("finalized")] = new Map()),
      zd?.({ ReactiveElement: _e }),
      (Re.reactiveElementVersions ?? (Re.reactiveElementVersions = [])).push(
        "2.1.2",
      ));
  });
  function p(o) {
    return (e, t) =>
      typeof t === "object"
        ? Nd(o, e, t)
        : ((r, i, n) => {
            const s = i.hasOwnProperty(n);
            return (
              i.constructor.createProperty(n, r),
              s ? Object.getOwnPropertyDescriptor(i, n) : void 0
            );
          })(o, e, t);
  }
  let Bd;
  let Nd;
  const Ir = d(() => {
    $t();
    ((Bd = {
      attribute: !0,
      type: String,
      converter: St,
      reflect: !1,
      hasChanged: ao,
    }),
      (Nd = (o = Bd, e, t) => {
        const { kind: r, metadata: i } = t;
        let n = globalThis.litPropertyMetadata.get(i);
        if (
          (n === void 0 &&
            globalThis.litPropertyMetadata.set(i, (n = new Map())),
          r === "setter" && ((o = Object.create(o)).wrapped = !0),
          n.set(t.name, o),
          r === "accessor")
        ) {
          const { name: s } = t;
          return {
            set(l) {
              const c = e.get.call(this);
              (e.set.call(this, l), this.requestUpdate(s, c, o, !0, l));
            },
            init(l) {
              return (l !== void 0 && this.C(s, void 0, o, l), l);
            },
          };
        }
        if (r === "setter") {
          const { name: s } = t;
          return function (l) {
            const c = this[s];
            (e.call(this, l), this.requestUpdate(s, c, o, !0, l));
          };
        }
        throw Error(`Unsupported decorator location: ${r}`);
      }));
  });
  function M(o) {
    return p({ ...o, state: !0, attribute: !1 });
  }
  const un = d(() => {
    Ir();
  });
  const hn = d(() => {});
  let ve;
  const it = d(() => {
    ve = (o, e, t) => (
      (t.configurable = !0),
      (t.enumerable = !0),
      Reflect.decorate &&
        typeof e !== "object" &&
        Object.defineProperty(o, e, t),
      t
    );
  });
  function S(o, e) {
    return (t, r, i) => {
      const n = (s) => s.renderRoot?.querySelector(o) ?? null;
      if (e) {
        const { get: s, set: l } =
          typeof r === "object"
            ? t
            : (i ??
              (() => {
                const c = Symbol();
                return {
                  get() {
                    return this[c];
                  },
                  set(m) {
                    this[c] = m;
                  },
                };
              })());
        return ve(t, r, {
          get() {
            let c = s.call(this);
            return (
              c === void 0 &&
                ((c = n(this)),
                (c !== null || this.hasUpdated) && l.call(this, c)),
              c
            );
          },
        });
      }
      return ve(t, r, {
        get() {
          return n(this);
        },
      });
    };
  }
  const mn = d(() => {
    it();
  });
  function fn(o) {
    return (e, t) =>
      ve(e, t, {
        get() {
          return (
            this.renderRoot ??
            Fd ??
            (Fd = document.createDocumentFragment())
          ).querySelectorAll(o);
        },
      });
  }
  let Fd;
  const vn = d(() => {
    it();
  });
  const gn = d(() => {
    it();
  });
  function Z(o) {
    return (e, t) => {
      const { slot: r, selector: i } = o ?? {};
      const n = `slot${r ? `[name=${r}]` : ":not([name])"}`;
      return ve(e, t, {
        get() {
          const s = this.renderRoot?.querySelector(n);
          const l = s?.assignedElements(o) ?? [];
          return i === void 0 ? l : l.filter((c) => c.matches(i));
        },
      });
    };
  }
  const yn = d(() => {
    it();
  });
  function bn(o) {
    return (e, t) => {
      const { slot: r } = o ?? {};
      const i = `slot${r ? `[name=${r}]` : ":not([name])"}`;
      return ve(e, t, {
        get() {
          return this.renderRoot?.querySelector(i)?.assignedNodes(o) ?? [];
        },
      });
    };
  }
  const xn = d(() => {
    it();
  });
  const I = d(() => {
    sn();
    Ir();
    un();
    hn();
    mn();
    vn();
    gn();
    yn();
    xn();
  });
  function Pn(o, e) {
    if (!Or(o) || !o.hasOwnProperty("raw"))
      throw Error("invalid template strings array");
    return wn !== void 0 ? wn.createHTML(e) : e;
  }
  function Ke(o, e, t = o, r) {
    if (e === J) return e;
    let i = r !== void 0 ? t._$Co?.[r] : t._$Cl;
    const n = kt(e) ? void 0 : e._$litDirective$;
    return (
      i?.constructor !== n &&
        (i?._$AO?.(!1),
        n === void 0 ? (i = void 0) : ((i = new n(o)), i._$AT(o, t, r)),
        r !== void 0 ? ((t._$Co ?? (t._$Co = []))[r] = i) : (t._$Cl = i)),
      i !== void 0 && (e = Ke(o, i._$AS(o, e.values), i, r)),
      e
    );
  }
  let Ot;
  let _n;
  let lo;
  let wn;
  let $r;
  let we;
  let Rr;
  let Ud;
  let je;
  let Pt;
  let kt;
  let Or;
  let Sn;
  let Sr;
  let Rt;
  let En;
  let An;
  let Ve;
  let Cn;
  let Tn;
  let $n;
  let Pr;
  let v;
  let Rn;
  let On;
  let J;
  let u;
  let In;
  let We;
  let kn;
  let Lt;
  let co;
  let nt;
  let Ge;
  let po;
  let uo;
  let ho;
  let mo;
  let Ln;
  let Hd;
  let st;
  const Ee = d(() => {
    ((Ot = globalThis),
      (_n = (o) => o),
      (lo = Ot.trustedTypes),
      (wn = lo
        ? lo.createPolicy("lit-html", { createHTML: (o) => o })
        : void 0),
      ($r = "$lit$"),
      (we = `lit$${Math.random().toFixed(9).slice(2)}$`),
      (Rr = `?${we}`),
      (Ud = `<${Rr}>`),
      (je = document),
      (Pt = () => je.createComment("")),
      (kt = (o) =>
        o === null || (typeof o !== "object" && typeof o !== "function")),
      (Or = Array.isArray),
      (Sn = (o) => Or(o) || typeof o?.[Symbol.iterator] === "function"),
      (Sr = `[ 	
\f\r]`),
      (Rt = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g),
      (En = /-->/g),
      (An = />/g),
      (Ve = RegExp(
        `>|${Sr}(?:([^\\s"'>=/]+)(${Sr}*=${Sr}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,
        "g",
      )),
      (Cn = /'/g),
      (Tn = /"/g),
      ($n = /^(?:script|style|textarea|title)$/i),
      (Pr =
        (o) =>
        (e, ...t) => ({ _$litType$: o, strings: e, values: t })),
      (v = Pr(1)),
      (Rn = Pr(2)),
      (On = Pr(3)),
      (J = Symbol.for("lit-noChange")),
      (u = Symbol.for("lit-nothing")),
      (In = new WeakMap()),
      (We = je.createTreeWalker(je, 129)));
    ((kn = (o, e) => {
      const t = o.length - 1;
      const r = [];
      let i;
      let n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "";
      let s = Rt;
      for (let l = 0; l < t; l++) {
        const c = o[l];
        let m;
        let f;
        let h = -1;
        let b = 0;
        for (
          ;
          b < c.length && ((s.lastIndex = b), (f = s.exec(c)), f !== null);
        )
          ((b = s.lastIndex),
            s === Rt
              ? f[1] === "!--"
                ? (s = En)
                : f[1] !== void 0
                  ? (s = An)
                  : f[2] !== void 0
                    ? ($n.test(f[2]) && (i = RegExp(`</${f[2]}`, "g")),
                      (s = Ve))
                    : f[3] !== void 0 && (s = Ve)
              : s === Ve
                ? f[0] === ">"
                  ? ((s = i ?? Rt), (h = -1))
                  : f[1] === void 0
                    ? (h = -2)
                    : ((h = s.lastIndex - f[2].length),
                      (m = f[1]),
                      (s = f[3] === void 0 ? Ve : f[3] === '"' ? Tn : Cn))
                : s === Tn || s === Cn
                  ? (s = Ve)
                  : s === En || s === An
                    ? (s = Rt)
                    : ((s = Ve), (i = void 0)));
        const _ = s === Ve && o[l + 1].startsWith("/>") ? " " : "";
        n +=
          s === Rt
            ? c + Ud
            : h >= 0
              ? (r.push(m), c.slice(0, h) + $r + c.slice(h) + we + _)
              : c + we + (h === -2 ? l : _);
      }
      return [
        Pn(
          o,
          n + (o[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : ""),
        ),
        r,
      ];
    }),
      (Lt = class o {
        constructor({ strings: e, _$litType$: t }, r) {
          let i;
          this.parts = [];
          let n = 0;
          let s = 0;
          const l = e.length - 1;
          const c = this.parts;
          const [m, f] = kn(e, t);
          if (
            ((this.el = o.createElement(m, r)),
            (We.currentNode = this.el.content),
            t === 2 || t === 3)
          ) {
            const h = this.el.content.firstChild;
            h.replaceWith(...h.childNodes);
          }
          for (; (i = We.nextNode()) !== null && c.length < l; ) {
            if (i.nodeType === 1) {
              if (i.hasAttributes())
                for (const h of i.getAttributeNames())
                  if (h.endsWith($r)) {
                    const b = f[s++];
                    const _ = i.getAttribute(h).split(we);
                    const P = /([.?@])?(.*)/.exec(b);
                    (c.push({
                      type: 1,
                      index: n,
                      name: P[2],
                      strings: _,
                      ctor:
                        P[1] === "."
                          ? po
                          : P[1] === "?"
                            ? uo
                            : P[1] === "@"
                              ? ho
                              : Ge,
                    }),
                      i.removeAttribute(h));
                  } else
                    h.startsWith(we) &&
                      (c.push({ type: 6, index: n }), i.removeAttribute(h));
              if ($n.test(i.tagName)) {
                const h = i.textContent.split(we);
                const b = h.length - 1;
                if (b > 0) {
                  i.textContent = lo ? lo.emptyScript : "";
                  for (let _ = 0; _ < b; _++)
                    (i.append(h[_], Pt()),
                      We.nextNode(),
                      c.push({ type: 2, index: ++n }));
                  i.append(h[b], Pt());
                }
              }
            } else if (i.nodeType === 8)
              if (i.data === Rr) c.push({ type: 2, index: n });
              else {
                let h = -1;
                for (; (h = i.data.indexOf(we, h + 1)) !== -1; )
                  (c.push({ type: 7, index: n }), (h += we.length - 1));
              }
            n++;
          }
        }

        static createElement(e, t) {
          const r = je.createElement("template");
          return ((r.innerHTML = e), r);
        }
      }));
    ((co = class {
      constructor(e, t) {
        ((this._$AV = []),
          (this._$AN = void 0),
          (this._$AD = e),
          (this._$AM = t));
      }

      get parentNode() {
        return this._$AM.parentNode;
      }

      get _$AU() {
        return this._$AM._$AU;
      }

      u(e) {
        const {
          el: { content: t },
          parts: r,
        } = this._$AD;
        const i = (e?.creationScope ?? je).importNode(t, !0);
        We.currentNode = i;
        let n = We.nextNode();
        let s = 0;
        let l = 0;
        let c = r[0];
        for (; c !== void 0; ) {
          if (s === c.index) {
            let m;
            (c.type === 2
              ? (m = new nt(n, n.nextSibling, this, e))
              : c.type === 1
                ? (m = new c.ctor(n, c.name, c.strings, this, e))
                : c.type === 6 && (m = new mo(n, this, e)),
              this._$AV.push(m),
              (c = r[++l]));
          }
          s !== c?.index && ((n = We.nextNode()), s++);
        }
        return ((We.currentNode = je), i);
      }

      p(e) {
        let t = 0;
        for (const r of this._$AV)
          (r !== void 0 &&
            (r.strings !== void 0
              ? (r._$AI(e, r, t), (t += r.strings.length - 2))
              : r._$AI(e[t])),
            t++);
      }
    }),
      (nt = class o {
        get _$AU() {
          return this._$AM?._$AU ?? this._$Cv;
        }

        constructor(e, t, r, i) {
          ((this.type = 2),
            (this._$AH = u),
            (this._$AN = void 0),
            (this._$AA = e),
            (this._$AB = t),
            (this._$AM = r),
            (this.options = i),
            (this._$Cv = i?.isConnected ?? !0));
        }

        get parentNode() {
          let e = this._$AA.parentNode;
          const t = this._$AM;
          return (t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e);
        }

        get startNode() {
          return this._$AA;
        }

        get endNode() {
          return this._$AB;
        }

        _$AI(e, t = this) {
          ((e = Ke(this, e, t)),
            kt(e)
              ? e === u || e == null || e === ""
                ? (this._$AH !== u && this._$AR(), (this._$AH = u))
                : e !== this._$AH && e !== J && this._(e)
              : e._$litType$ !== void 0
                ? this.$(e)
                : e.nodeType !== void 0
                  ? this.T(e)
                  : Sn(e)
                    ? this.k(e)
                    : this._(e));
        }

        O(e) {
          return this._$AA.parentNode.insertBefore(e, this._$AB);
        }

        T(e) {
          this._$AH !== e && (this._$AR(), (this._$AH = this.O(e)));
        }

        _(e) {
          (this._$AH !== u && kt(this._$AH)
            ? (this._$AA.nextSibling.data = e)
            : this.T(je.createTextNode(e)),
            (this._$AH = e));
        }

        $(e) {
          const { values: t, _$litType$: r } = e;
          const i =
            typeof r === "number"
              ? this._$AC(e)
              : (r.el === void 0 &&
                  (r.el = Lt.createElement(Pn(r.h, r.h[0]), this.options)),
                r);
          if (this._$AH?._$AD === i) this._$AH.p(t);
          else {
            const n = new co(i, this);
            const s = n.u(this.options);
            (n.p(t), this.T(s), (this._$AH = n));
          }
        }

        _$AC(e) {
          let t = In.get(e.strings);
          return (t === void 0 && In.set(e.strings, (t = new Lt(e))), t);
        }

        k(e) {
          Or(this._$AH) || ((this._$AH = []), this._$AR());
          const t = this._$AH;
          let r;
          let i = 0;
          for (const n of e)
            (i === t.length
              ? t.push(
                  (r = new o(this.O(Pt()), this.O(Pt()), this, this.options)),
                )
              : (r = t[i]),
              r._$AI(n),
              i++);
          i < t.length &&
            (this._$AR(r && r._$AB.nextSibling, i), (t.length = i));
        }

        _$AR(e = this._$AA.nextSibling, t) {
          for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
            const r = _n(e).nextSibling;
            (_n(e).remove(), (e = r));
          }
        }

        setConnected(e) {
          this._$AM === void 0 && ((this._$Cv = e), this._$AP?.(e));
        }
      }),
      (Ge = class {
        get tagName() {
          return this.element.tagName;
        }

        get _$AU() {
          return this._$AM._$AU;
        }

        constructor(e, t, r, i, n) {
          ((this.type = 1),
            (this._$AH = u),
            (this._$AN = void 0),
            (this.element = e),
            (this.name = t),
            (this._$AM = i),
            (this.options = n),
            r.length > 2 || r[0] !== "" || r[1] !== ""
              ? ((this._$AH = Array(r.length - 1).fill(new String())),
                (this.strings = r))
              : (this._$AH = u));
        }

        _$AI(e, t = this, r, i) {
          const n = this.strings;
          let s = !1;
          if (n === void 0)
            ((e = Ke(this, e, t, 0)),
              (s = !kt(e) || (e !== this._$AH && e !== J)),
              s && (this._$AH = e));
          else {
            const l = e;
            let c;
            let m;
            for (e = n[0], c = 0; c < n.length - 1; c++)
              ((m = Ke(this, l[r + c], t, c)),
                m === J && (m = this._$AH[c]),
                s || (s = !kt(m) || m !== this._$AH[c]),
                m === u ? (e = u) : e !== u && (e += (m ?? "") + n[c + 1]),
                (this._$AH[c] = m));
          }
          s && !i && this.j(e);
        }

        j(e) {
          e === u
            ? this.element.removeAttribute(this.name)
            : this.element.setAttribute(this.name, e ?? "");
        }
      }),
      (po = class extends Ge {
        constructor() {
          (super(...arguments), (this.type = 3));
        }

        j(e) {
          this.element[this.name] = e === u ? void 0 : e;
        }
      }),
      (uo = class extends Ge {
        constructor() {
          (super(...arguments), (this.type = 4));
        }

        j(e) {
          this.element.toggleAttribute(this.name, !!e && e !== u);
        }
      }),
      (ho = class extends Ge {
        constructor(e, t, r, i, n) {
          (super(e, t, r, i, n), (this.type = 5));
        }

        _$AI(e, t = this) {
          if ((e = Ke(this, e, t, 0) ?? u) === J) return;
          const r = this._$AH;
          const i =
            (e === u && r !== u) ||
            e.capture !== r.capture ||
            e.once !== r.once ||
            e.passive !== r.passive;
          const n = e !== u && (r === u || i);
          (i && this.element.removeEventListener(this.name, this, r),
            n && this.element.addEventListener(this.name, this, e),
            (this._$AH = e));
        }

        handleEvent(e) {
          typeof this._$AH === "function"
            ? this._$AH.call(this.options?.host ?? this.element, e)
            : this._$AH.handleEvent(e);
        }
      }),
      (mo = class {
        constructor(e, t, r) {
          ((this.element = e),
            (this.type = 6),
            (this._$AN = void 0),
            (this._$AM = t),
            (this.options = r));
        }

        get _$AU() {
          return this._$AM._$AU;
        }

        _$AI(e) {
          Ke(this, e);
        }
      }),
      (Ln = {
        M: $r,
        P: we,
        A: Rr,
        C: 1,
        L: kn,
        R: co,
        D: Sn,
        V: Ke,
        I: nt,
        H: Ge,
        N: uo,
        U: ho,
        B: po,
        F: mo,
      }),
      (Hd = Ot.litHtmlPolyfillSupport));
    (Hd?.(Lt, nt),
      (Ot.litHtmlVersions ?? (Ot.litHtmlVersions = [])).push("3.3.2"));
    st = (o, e, t) => {
      const r = t?.renderBefore ?? e;
      let i = r._$litPart$;
      if (i === void 0) {
        const n = t?.renderBefore ?? null;
        r._$litPart$ = i = new nt(e.insertBefore(Pt(), n), n, void 0, t ?? {});
      }
      return (i._$AI(o), i);
    };
  });
  let Mt;
  let E;
  let qd;
  const Mn = d(() => {
    $t();
    $t();
    Ee();
    Ee();
    ((Mt = globalThis),
      (E = class extends _e {
        constructor() {
          (super(...arguments),
            (this.renderOptions = { host: this }),
            (this._$Do = void 0));
        }

        createRenderRoot() {
          let t;
          const e = super.createRenderRoot();
          return (
            (t = this.renderOptions).renderBefore ??
              (t.renderBefore = e.firstChild),
            e
          );
        }

        update(e) {
          const t = this.render();
          (this.hasUpdated ||
            (this.renderOptions.isConnected = this.isConnected),
            super.update(e),
            (this._$Do = st(t, this.renderRoot, this.renderOptions)));
        }

        connectedCallback() {
          (super.connectedCallback(), this._$Do?.setConnected(!0));
        }

        disconnectedCallback() {
          (super.disconnectedCallback(), this._$Do?.setConnected(!1));
        }

        render() {
          return J;
        }
      }));
    ((E._$litElement$ = !0),
      (E.finalized = !0),
      Mt.litElementHydrateSupport?.({ LitElement: E }));
    qd = Mt.litElementPolyfillSupport;
    qd?.({ LitElement: E });
    (Mt.litElementVersions ?? (Mt.litElementVersions = [])).push("4.2.2");
  });
  const Dn = d(() => {});
  const y = d(() => {
    $t();
    Ee();
    Mn();
    Dn();
  });
  let fo;
  const zn = d(() => {
    y();
    fo = class extends E {
      connectedCallback() {
        (super.connectedCallback(), this.setAttribute("aria-hidden", "true"));
      }

      render() {
        return v`<span class="shadow"></span>`;
      }
    };
  });
  let Bn;
  const Nn = d(() => {
    y();
    Bn = x`:host,.shadow,.shadow::before,.shadow::after{border-radius:inherit;inset:0;position:absolute;transition-duration:inherit;transition-property:inherit;transition-timing-function:inherit}:host{display:flex;pointer-events:none;transition-property:box-shadow,opacity}.shadow::before,.shadow::after{content:"";transition-property:box-shadow,opacity;--_level: var(--md-elevation-level, 0);--_shadow-color: var(--md-elevation-shadow-color, var(--md-sys-color-shadow, #000))}.shadow::before{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 3,1) + 2*clamp(0,var(--_level) - 4,1))) calc(1px*(2*clamp(0,var(--_level),1) + clamp(0,var(--_level) - 2,1) + clamp(0,var(--_level) - 4,1))) 0px var(--_shadow-color);opacity:.3}.shadow::after{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 1,1) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(3*clamp(0,var(--_level),2) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(clamp(0,var(--_level),4) + 2*clamp(0,var(--_level) - 4,1))) var(--_shadow-color);opacity:.15}
`;
  });
  let kr;
  const Lr = d(() => {
    T();
    I();
    zn();
    Nn();
    kr = class extends fo {};
    kr.styles = [Bn];
    kr = a([C("md-elevation")], kr);
  });
  let Fn;
  let Un;
  let at;
  const Mr = d(() => {
    y();
    Fn = Symbol("attachableController");
    Un = new MutationObserver((o) => {
      for (const e of o) e.target[Fn]?.hostConnected();
    });
    at = class {
      get htmlFor() {
        return this.host.getAttribute("for");
      }

      set htmlFor(e) {
        e === null
          ? this.host.removeAttribute("for")
          : this.host.setAttribute("for", e);
      }

      get control() {
        return this.host.hasAttribute("for")
          ? !this.htmlFor || !this.host.isConnected
            ? null
            : this.host.getRootNode().querySelector(`#${this.htmlFor}`)
          : this.currentControl || this.host.parentElement;
      }

      set control(e) {
        e ? this.attach(e) : this.detach();
      }

      constructor(e, t) {
        ((this.host = e),
          (this.onControlChange = t),
          (this.currentControl = null),
          e.addController(this),
          (e[Fn] = this),
          Un?.observe(e, { attributeFilter: ["for"] }));
      }

      attach(e) {
        e !== this.currentControl &&
          (this.setCurrentControl(e), this.host.removeAttribute("for"));
      }

      detach() {
        (this.setCurrentControl(null), this.host.setAttribute("for", ""));
      }

      hostConnected() {
        this.setCurrentControl(this.control);
      }

      hostDisconnected() {
        this.setCurrentControl(null);
      }

      setCurrentControl(e) {
        (this.onControlChange(this.currentControl, e),
          (this.currentControl = e));
      }
    };
  });
  let Vd;
  let lt;
  let Hn;
  const qn = d(() => {
    T();
    y();
    I();
    Mr();
    ((Vd = ["focusin", "focusout", "pointerdown"]),
      (lt = class extends E {
        constructor() {
          (super(...arguments),
            (this.visible = !1),
            (this.inward = !1),
            (this.attachableController = new at(
              this,
              this.onControlChange.bind(this),
            )));
        }

        get htmlFor() {
          return this.attachableController.htmlFor;
        }

        set htmlFor(e) {
          this.attachableController.htmlFor = e;
        }

        get control() {
          return this.attachableController.control;
        }

        set control(e) {
          this.attachableController.control = e;
        }

        attach(e) {
          this.attachableController.attach(e);
        }

        detach() {
          this.attachableController.detach();
        }

        connectedCallback() {
          (super.connectedCallback(), this.setAttribute("aria-hidden", "true"));
        }

        handleEvent(e) {
          if (!e[Hn]) {
            switch (e.type) {
              default:
                return;
              case "focusin":
                this.visible = this.control?.matches(":focus-visible") ?? !1;
                break;
              case "focusout":
              case "pointerdown":
                this.visible = !1;
                break;
            }
            e[Hn] = !0;
          }
        }

        onControlChange(e, t) {
          if (1)
            for (const r of Vd)
              (e?.removeEventListener(r, this), t?.addEventListener(r, this));
        }

        update(e) {
          (e.has("visible") &&
            this.dispatchEvent(new Event("visibility-changed")),
            super.update(e));
        }
      }));
    a([p({ type: Boolean, reflect: !0 })], lt.prototype, "visible", void 0);
    a([p({ type: Boolean, reflect: !0 })], lt.prototype, "inward", void 0);
    Hn = Symbol("handledByFocusRing");
  });
  let Vn;
  const Wn = d(() => {
    y();
    Vn = x`:host{animation-delay:0s,calc(var(--md-focus-ring-duration, 600ms)*.25);animation-duration:calc(var(--md-focus-ring-duration, 600ms)*.25),calc(var(--md-focus-ring-duration, 600ms)*.75);animation-timing-function:cubic-bezier(0.2, 0, 0, 1);box-sizing:border-box;color:var(--md-focus-ring-color, var(--md-sys-color-secondary, #625b71));display:none;pointer-events:none;position:absolute}:host([visible]){display:flex}:host(:not([inward])){animation-name:outward-grow,outward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));inset:calc(-1*var(--md-focus-ring-outward-offset, 2px));outline:var(--md-focus-ring-width, 3px) solid currentColor}:host([inward]){animation-name:inward-grow,inward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border:var(--md-focus-ring-width, 3px) solid currentColor;inset:var(--md-focus-ring-inward-offset, 0px)}@keyframes outward-grow{from{outline-width:0}to{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes outward-shrink{from{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-grow{from{border-width:0}to{border-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-shrink{from{border-width:var(--md-focus-ring-active-width, 8px)}}@media(prefers-reduced-motion){:host{animation:none}}
`;
  });
  let Dr;
  const dt = d(() => {
    T();
    I();
    qn();
    Wn();
    Dr = class extends lt {};
    Dr.styles = [Vn];
    Dr = a([C("md-focus-ring")], Dr);
  });
  let pe;
  let ct;
  let Oe;
  const vo = d(() => {
    ((pe = {
      ATTRIBUTE: 1,
      CHILD: 2,
      PROPERTY: 3,
      BOOLEAN_ATTRIBUTE: 4,
      EVENT: 5,
      ELEMENT: 6,
    }),
      (ct =
        (o) =>
        (...e) => ({ _$litDirective$: o, values: e })),
      (Oe = class {
        constructor(e) {}

        get _$AU() {
          return this._$AM._$AU;
        }

        _$AT(e, t, r) {
          ((this._$Ct = e), (this._$AM = t), (this._$Ci = r));
        }

        _$AS(e, t) {
          return this.update(e, t);
        }

        update(e, t) {
          return this.render(...t);
        }
      }));
  });
  let K;
  const jn = d(() => {
    Ee();
    vo();
    K = ct(
      class extends Oe {
        constructor(o) {
          if (
            (super(o),
            o.type !== pe.ATTRIBUTE ||
              o.name !== "class" ||
              o.strings?.length > 2)
          )
            throw Error(
              "`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.",
            );
        }

        render(o) {
          return ` ${Object.keys(o)
            .filter((e) => o[e])
            .join(" ")} `;
        }

        update(o, [e]) {
          if (this.st === void 0) {
            ((this.st = new Set()),
              o.strings !== void 0 &&
                (this.nt = new Set(
                  o.strings
                    .join(" ")
                    .split(/\s/)
                    .filter((r) => r !== ""),
                )));
            for (const r in e) e[r] && !this.nt?.has(r) && this.st.add(r);
            return this.render(e);
          }
          const t = o.element.classList;
          for (const r of this.st) r in e || (t.remove(r), this.st.delete(r));
          for (const r in e) {
            const i = !!e[r];
            i === this.st.has(r) ||
              this.nt?.has(r) ||
              (i
                ? (t.add(r), this.st.add(r))
                : (t.remove(r), this.st.delete(r)));
          }
          return J;
        }
      },
    );
  });
  const ge = d(() => {
    jn();
  });
  function Kn() {
    let o = null;
    return {
      start() {
        return (o?.abort(), (o = new AbortController()), o.signal);
      },
      finish() {
        o = null;
      },
    };
  }
  let te;
  const Dt = d(() => {
    te = {
      STANDARD: "cubic-bezier(0.2, 0, 0, 1)",
      STANDARD_ACCELERATE: "cubic-bezier(.3,0,1,1)",
      STANDARD_DECELERATE: "cubic-bezier(0,0,0,1)",
      EMPHASIZED: "cubic-bezier(.3,0,0,1)",
      EMPHASIZED_ACCELERATE: "cubic-bezier(.3,0,.8,.15)",
      EMPHASIZED_DECELERATE: "cubic-bezier(.05,.7,.1,1)",
    };
  });
  let Wd;
  let Gn;
  let jd;
  let Kd;
  let Gd;
  let Yd;
  let Xd;
  let Zd;
  let Q;
  let Jd;
  let Qd;
  let ec;
  let Pe;
  const Yn = d(() => {
    T();
    y();
    I();
    ge();
    Mr();
    Dt();
    ((Wd = 450),
      (Gn = 225),
      (jd = 0.2),
      (Kd = 10),
      (Gd = 75),
      (Yd = 0.35),
      (Xd = "::after"),
      (Zd = "forwards"));
    (function (o) {
      ((o[(o.INACTIVE = 0)] = "INACTIVE"),
        (o[(o.TOUCH_DELAY = 1)] = "TOUCH_DELAY"),
        (o[(o.HOLDING = 2)] = "HOLDING"),
        (o[(o.WAITING_FOR_CLICK = 3)] = "WAITING_FOR_CLICK"));
    })(Q || (Q = {}));
    ((Jd = [
      "click",
      "contextmenu",
      "pointercancel",
      "pointerdown",
      "pointerenter",
      "pointerleave",
      "pointerup",
    ]),
      (Qd = 150),
      (ec = window.matchMedia("(forced-colors: active)")),
      (Pe = class extends E {
        constructor() {
          (super(...arguments),
            (this.disabled = !1),
            (this.hovered = !1),
            (this.pressed = !1),
            (this.rippleSize = ""),
            (this.rippleScale = ""),
            (this.initialSize = 0),
            (this.state = Q.INACTIVE),
            (this.attachableController = new at(
              this,
              this.onControlChange.bind(this),
            )));
        }

        get htmlFor() {
          return this.attachableController.htmlFor;
        }

        set htmlFor(e) {
          this.attachableController.htmlFor = e;
        }

        get control() {
          return this.attachableController.control;
        }

        set control(e) {
          this.attachableController.control = e;
        }

        attach(e) {
          this.attachableController.attach(e);
        }

        detach() {
          this.attachableController.detach();
        }

        connectedCallback() {
          (super.connectedCallback(), this.setAttribute("aria-hidden", "true"));
        }

        render() {
          const e = { hovered: this.hovered, pressed: this.pressed };
          return v`<div class="surface ${K(e)}"></div>`;
        }

        update(e) {
          (e.has("disabled") &&
            this.disabled &&
            ((this.hovered = !1), (this.pressed = !1)),
            super.update(e));
        }

        handlePointerenter(e) {
          this.shouldReactToEvent(e) && (this.hovered = !0);
        }

        handlePointerleave(e) {
          this.shouldReactToEvent(e) &&
            ((this.hovered = !1),
            this.state !== Q.INACTIVE && this.endPressAnimation());
        }

        handlePointerup(e) {
          if (this.shouldReactToEvent(e)) {
            if (this.state === Q.HOLDING) {
              this.state = Q.WAITING_FOR_CLICK;
              return;
            }
            if (this.state === Q.TOUCH_DELAY) {
              ((this.state = Q.WAITING_FOR_CLICK),
                this.startPressAnimation(this.rippleStartEvent));
            }
          }
        }

        async handlePointerdown(e) {
          if (this.shouldReactToEvent(e)) {
            if (((this.rippleStartEvent = e), !this.isTouch(e))) {
              ((this.state = Q.WAITING_FOR_CLICK), this.startPressAnimation(e));
              return;
            }
            ((this.state = Q.TOUCH_DELAY),
              await new Promise((t) => {
                setTimeout(t, Qd);
              }),
              this.state === Q.TOUCH_DELAY &&
                ((this.state = Q.HOLDING), this.startPressAnimation(e)));
          }
        }

        handleClick() {
          if (!this.disabled) {
            if (this.state === Q.WAITING_FOR_CLICK) {
              this.endPressAnimation();
              return;
            }
            this.state === Q.INACTIVE &&
              (this.startPressAnimation(), this.endPressAnimation());
          }
        }

        handlePointercancel(e) {
          this.shouldReactToEvent(e) && this.endPressAnimation();
        }

        handleContextmenu() {
          this.disabled || this.endPressAnimation();
        }

        determineRippleSize() {
          const { height: e, width: t } = this.getBoundingClientRect();
          const r = Math.max(e, t);
          const i = Math.max(Yd * r, Gd);
          const n = this.currentCSSZoom ?? 1;
          const s = Math.floor((r * jd) / n);
          const c = Math.sqrt(t ** 2 + e ** 2) + Kd;
          this.initialSize = s;
          const m = (c + i) / s;
          ((this.rippleScale = `${m / n}`), (this.rippleSize = `${s}px`));
        }

        getNormalizedPointerEventCoords(e) {
          const { scrollX: t, scrollY: r } = window;
          const { left: i, top: n } = this.getBoundingClientRect();
          const s = t + i;
          const l = r + n;
          const { pageX: c, pageY: m } = e;
          const f = this.currentCSSZoom ?? 1;
          return { x: (c - s) / f, y: (m - l) / f };
        }

        getTranslationCoordinates(e) {
          const { height: t, width: r } = this.getBoundingClientRect();
          const i = this.currentCSSZoom ?? 1;
          const n = {
            x: (r / i - this.initialSize) / 2,
            y: (t / i - this.initialSize) / 2,
          };
          let s;
          return (
            e instanceof PointerEvent
              ? (s = this.getNormalizedPointerEventCoords(e))
              : (s = { x: r / i / 2, y: t / i / 2 }),
            (s = {
              x: s.x - this.initialSize / 2,
              y: s.y - this.initialSize / 2,
            }),
            { startPoint: s, endPoint: n }
          );
        }

        startPressAnimation(e) {
          if (!this.mdRoot) return;
          ((this.pressed = !0),
            this.growAnimation?.cancel(),
            this.determineRippleSize());
          const { startPoint: t, endPoint: r } =
            this.getTranslationCoordinates(e);
          const i = `${t.x}px, ${t.y}px`;
          const n = `${r.x}px, ${r.y}px`;
          this.growAnimation = this.mdRoot.animate(
            {
              top: [0, 0],
              left: [0, 0],
              height: [this.rippleSize, this.rippleSize],
              width: [this.rippleSize, this.rippleSize],
              transform: [
                `translate(${i}) scale(1)`,
                `translate(${n}) scale(${this.rippleScale})`,
              ],
            },
            {
              pseudoElement: Xd,
              duration: Wd,
              easing: te.STANDARD,
              fill: Zd,
            },
          );
        }

        async endPressAnimation() {
          ((this.rippleStartEvent = void 0), (this.state = Q.INACTIVE));
          const e = this.growAnimation;
          let t = 1 / 0;
          if (
            (typeof e?.currentTime === "number"
              ? (t = e.currentTime)
              : e?.currentTime && (t = e.currentTime.to("ms").value),
            t >= Gn)
          ) {
            this.pressed = !1;
            return;
          }
          (await new Promise((r) => {
            setTimeout(r, Gn - t);
          }),
            this.growAnimation === e && (this.pressed = !1));
        }

        shouldReactToEvent(e) {
          if (
            this.disabled ||
            !e.isPrimary ||
            (this.rippleStartEvent &&
              this.rippleStartEvent.pointerId !== e.pointerId)
          )
            return !1;
          if (e.type === "pointerenter" || e.type === "pointerleave")
            return !this.isTouch(e);
          const t = e.buttons === 1;
          return this.isTouch(e) || t;
        }

        isTouch({ pointerType: e }) {
          return e === "touch";
        }

        async handleEvent(e) {
          if (!ec?.matches)
            switch (e.type) {
              case "click":
                this.handleClick();
                break;
              case "contextmenu":
                this.handleContextmenu();
                break;
              case "pointercancel":
                this.handlePointercancel(e);
                break;
              case "pointerdown":
                await this.handlePointerdown(e);
                break;
              case "pointerenter":
                this.handlePointerenter(e);
                break;
              case "pointerleave":
                this.handlePointerleave(e);
                break;
              case "pointerup":
                this.handlePointerup(e);
                break;
              default:
                break;
            }
        }

        onControlChange(e, t) {
          if (1)
            for (const r of Jd)
              (e?.removeEventListener(r, this), t?.addEventListener(r, this));
        }
      }));
    a([p({ type: Boolean, reflect: !0 })], Pe.prototype, "disabled", void 0);
    a([M()], Pe.prototype, "hovered", void 0);
    a([M()], Pe.prototype, "pressed", void 0);
    a([S(".surface")], Pe.prototype, "mdRoot", void 0);
  });
  let Xn;
  const Zn = d(() => {
    y();
    Xn = x`:host{display:flex;margin:auto;pointer-events:none}:host([disabled]){display:none}@media(forced-colors: active){:host{display:none}}:host,.surface{border-radius:inherit;position:absolute;inset:0;overflow:hidden}.surface{-webkit-tap-highlight-color:rgba(0,0,0,0)}.surface::before,.surface::after{content:"";opacity:0;position:absolute}.surface::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));inset:0;transition:opacity 15ms linear,background-color 15ms linear}.surface::after{background:radial-gradient(closest-side, var(--md-ripple-pressed-color, var(--md-sys-color-on-surface, #1d1b20)) max(100% - 70px, 65%), transparent 100%);transform-origin:center center;transition:opacity 375ms linear}.hovered::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-ripple-hover-opacity, 0.08)}.pressed::after{opacity:var(--md-ripple-pressed-opacity, 0.12);transition-duration:105ms}
`;
  });
  let zr;
  const zt = d(() => {
    T();
    I();
    Yn();
    Zn();
    zr = class extends Pe {};
    zr.styles = [Xn];
    zr = a([C("md-ripple")], zr);
  });
  function go(o) {
    return tc.includes(o);
  }
  function Nr(o) {
    return o
      .replace("aria", "aria-")
      .replace(/Elements?/g, "")
      .toLowerCase();
  }
  let Br;
  let tc;
  const Jn = d(() => {
    ((Br = [
      "role",
      "ariaAtomic",
      "ariaAutoComplete",
      "ariaBusy",
      "ariaChecked",
      "ariaColCount",
      "ariaColIndex",
      "ariaColSpan",
      "ariaCurrent",
      "ariaDisabled",
      "ariaExpanded",
      "ariaHasPopup",
      "ariaHidden",
      "ariaInvalid",
      "ariaKeyShortcuts",
      "ariaLabel",
      "ariaLevel",
      "ariaLive",
      "ariaModal",
      "ariaMultiLine",
      "ariaMultiSelectable",
      "ariaOrientation",
      "ariaPlaceholder",
      "ariaPosInSet",
      "ariaPressed",
      "ariaReadOnly",
      "ariaRequired",
      "ariaRoleDescription",
      "ariaRowCount",
      "ariaRowIndex",
      "ariaRowSpan",
      "ariaSelected",
      "ariaSetSize",
      "ariaSort",
      "ariaValueMax",
      "ariaValueMin",
      "ariaValueNow",
      "ariaValueText",
    ]),
      (tc = Br.map(Nr)));
  });
  function oe(o) {
    let e;
    if (!1) return o;
    class t extends o {
      constructor() {
        (super(...arguments), (this[e] = new Set()));
      }

      attributeChangedCallback(i, n, s) {
        if (!go(i)) {
          super.attributeChangedCallback(i, n, s);
          return;
        }
        if (this[yo].has(i)) return;
        (this[yo].add(i), this.removeAttribute(i), this[yo].delete(i));
        const l = Ur(i);
        (s === null ? delete this.dataset[l] : (this.dataset[l] = s),
          this.requestUpdate(Ur(i), n));
      }

      getAttribute(i) {
        return go(i) ? super.getAttribute(Fr(i)) : super.getAttribute(i);
      }

      removeAttribute(i) {
        (super.removeAttribute(i),
          go(i) && (super.removeAttribute(Fr(i)), this.requestUpdate()));
      }
    }
    return ((e = yo), oc(t), t);
  }
  function oc(o) {
    for (const e of Br) {
      const t = Nr(e);
      const r = Fr(t);
      const i = Ur(t);
      (o.createProperty(e, { attribute: t, noAccessor: !0 }),
        o.createProperty(Symbol(r), { attribute: r, noAccessor: !0 }),
        Object.defineProperty(o.prototype, e, {
          configurable: !0,
          enumerable: !0,
          get() {
            return this.dataset[i] ?? null;
          },
          set(n) {
            const s = this.dataset[i] ?? null;
            n !== s &&
              (n === null ? delete this.dataset[i] : (this.dataset[i] = n),
              this.requestUpdate(e, s));
          },
        }));
    }
  }
  function Fr(o) {
    return `data-${o}`;
  }
  function Ur(o) {
    return o.replace(/-\w/, (e) => e[1].toUpperCase());
  }
  let yo;
  const ke = d(() => {
    y();
    Jn();
    yo = Symbol("privateIgnoreAttributeChangesFor");
  });
  function Le(o) {
    class e extends o {
      get [j]() {
        return (this[Hr] || (this[Hr] = this.attachInternals()), this[Hr]);
      }
    }
    return e;
  }
  let j;
  let Hr;
  const Ae = d(() => {
    ((j = Symbol("internals")), (Hr = Symbol("privateInternals")));
  });
  function bo(o) {
    o.addInitializer((e) => {
      const t = e;
      t.addEventListener("click", async (r) => {
        const { type: i, [j]: n } = t;
        const { form: s } = n;
        if (
          !(!s || i === "button") &&
          (await new Promise((l) => {
            setTimeout(l);
          }),
          !r.defaultPrevented)
        ) {
          if (i === "reset") {
            s.reset();
            return;
          }
          (s.addEventListener(
            "submit",
            (l) => {
              Object.defineProperty(l, "submitter", {
                configurable: !0,
                enumerable: !0,
                get: () => t,
              });
            },
            { capture: !0, once: !0 },
          ),
            n.setFormValue(t.value),
            s.requestSubmit());
        }
      });
    });
  }
  const qr = d(() => {
    y();
    Ae();
  });
  function Qn(o) {
    const e = new MouseEvent("click", { bubbles: !0 });
    return (o.dispatchEvent(e), e);
  }
  function es(o) {
    return o.currentTarget !== o.target ||
      o.composedPath()[0] !== o.target ||
      o.target.disabled
      ? !1
      : !rc(o);
  }
  function rc(o) {
    const e = Vr;
    return (e && (o.preventDefault(), o.stopImmediatePropagation()), ic(), e);
  }
  async function ic() {
    ((Vr = !0), await null, (Vr = !1));
  }
  let Vr;
  const ts = d(() => {
    Vr = !1;
  });
  let nc;
  let W;
  const xo = d(() => {
    T();
    dt();
    zt();
    y();
    I();
    ke();
    qr();
    ts();
    Ae();
    ((nc = oe(Le(E))),
      (W = class extends nc {
        get name() {
          return this.getAttribute("name") ?? "";
        }

        set name(e) {
          this.setAttribute("name", e);
        }

        get form() {
          return this[j].form;
        }

        constructor() {
          (super(),
            (this.disabled = !1),
            (this.softDisabled = !1),
            (this.href = ""),
            (this.download = ""),
            (this.target = ""),
            (this.trailingIcon = !1),
            (this.hasIcon = !1),
            (this.type = "submit"),
            (this.value = ""),
            this.addEventListener("click", this.handleClick.bind(this)));
        }

        focus() {
          this.buttonElement?.focus();
        }

        blur() {
          this.buttonElement?.blur();
        }

        render() {
          const e = this.disabled || this.softDisabled;
          const t = this.href ? this.renderLink() : this.renderButton();
          const r = this.href ? "link" : "button";
          return v`
      ${this.renderElevationOrOutline?.()}
      <div class="background"></div>
      <md-focus-ring part="focus-ring" for=${r}></md-focus-ring>
      <md-ripple
        part="ripple"
        for=${r}
        ?disabled="${e}"></md-ripple>
      ${t}
    `;
        }

        renderButton() {
          const { ariaLabel: e, ariaHasPopup: t, ariaExpanded: r } = this;
          return v`<button
      id="button"
      class="button"
      ?disabled=${this.disabled}
      aria-disabled=${this.softDisabled || u}
      aria-label="${e || u}"
      aria-haspopup="${t || u}"
      aria-expanded="${r || u}">
      ${this.renderContent()}
    </button>`;
        }

        renderLink() {
          const { ariaLabel: e, ariaHasPopup: t, ariaExpanded: r } = this;
          return v`<a
      id="link"
      class="button"
      aria-label="${e || u}"
      aria-haspopup="${t || u}"
      aria-expanded="${r || u}"
      aria-disabled=${this.disabled || this.softDisabled || u}
      tabindex="${this.disabled && !this.softDisabled ? -1 : u}"
      href=${this.href}
      download=${this.download || u}
      target=${this.target || u}
      >${this.renderContent()}
    </a>`;
        }

        renderContent() {
          const e = v`<slot
      name="icon"
      @slotchange="${this.handleSlotChange}"></slot>`;
          return v`
      <span class="touch"></span>
      ${this.trailingIcon ? u : e}
      <span class="label"><slot></slot></span>
      ${this.trailingIcon ? e : u}
    `;
        }

        handleClick(e) {
          if (this.softDisabled || (this.disabled && this.href)) {
            (e.stopImmediatePropagation(), e.preventDefault());
            return;
          }
          !es(e) ||
            !this.buttonElement ||
            (this.focus(), Qn(this.buttonElement));
        }

        handleSlotChange() {
          this.hasIcon = this.assignedIcons.length > 0;
        }
      }));
    bo(W);
    W.formAssociated = !0;
    W.shadowRootOptions = { mode: "open", delegatesFocus: !0 };
    a([p({ type: Boolean, reflect: !0 })], W.prototype, "disabled", void 0);
    a(
      [p({ type: Boolean, attribute: "soft-disabled", reflect: !0 })],
      W.prototype,
      "softDisabled",
      void 0,
    );
    a([p()], W.prototype, "href", void 0);
    a([p()], W.prototype, "download", void 0);
    a([p()], W.prototype, "target", void 0);
    a(
      [p({ type: Boolean, attribute: "trailing-icon", reflect: !0 })],
      W.prototype,
      "trailingIcon",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "has-icon", reflect: !0 })],
      W.prototype,
      "hasIcon",
      void 0,
    );
    a([p()], W.prototype, "type", void 0);
    a([p({ reflect: !0 })], W.prototype, "value", void 0);
    a([S(".button")], W.prototype, "buttonElement", void 0);
    a([Z({ slot: "icon", flatten: !0 })], W.prototype, "assignedIcons", void 0);
  });
  let _o;
  const os = d(() => {
    Lr();
    y();
    xo();
    _o = class extends W {
      renderElevationOrOutline() {
        return v`<md-elevation part="elevation"></md-elevation>`;
      }
    };
  });
  let rs;
  const is = d(() => {
    y();
    rs = x`:host{--_container-color: var(--md-filled-button-container-color, var(--md-sys-color-primary, #6750a4));--_container-elevation: var(--md-filled-button-container-elevation, 0);--_container-height: var(--md-filled-button-container-height, 40px);--_container-shadow-color: var(--md-filled-button-container-shadow-color, var(--md-sys-color-shadow, #000));--_disabled-container-color: var(--md-filled-button-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-elevation: var(--md-filled-button-disabled-container-elevation, 0);--_disabled-container-opacity: var(--md-filled-button-disabled-container-opacity, 0.12);--_disabled-label-text-color: var(--md-filled-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-button-disabled-label-text-opacity, 0.38);--_focus-container-elevation: var(--md-filled-button-focus-container-elevation, 0);--_focus-label-text-color: var(--md-filled-button-focus-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-container-elevation: var(--md-filled-button-hover-container-elevation, 1);--_hover-label-text-color: var(--md-filled-button-hover-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-color: var(--md-filled-button-hover-state-layer-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-opacity: var(--md-filled-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-filled-button-label-text-color, var(--md-sys-color-on-primary, #fff));--_label-text-font: var(--md-filled-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-filled-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-filled-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-container-elevation: var(--md-filled-button-pressed-container-elevation, 0);--_pressed-label-text-color: var(--md-filled-button-pressed-label-text-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-color: var(--md-filled-button-pressed-state-layer-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-opacity: var(--md-filled-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-filled-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-filled-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-filled-button-focus-icon-color, var(--md-sys-color-on-primary, #fff));--_hover-icon-color: var(--md-filled-button-hover-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-color: var(--md-filled-button-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-size: var(--md-filled-button-icon-size, 18px);--_pressed-icon-color: var(--md-filled-button-pressed-icon-color, var(--md-sys-color-on-primary, #fff));--_container-shape-start-start: var(--md-filled-button-container-shape-start-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-filled-button-container-shape-start-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-filled-button-container-shape-end-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-filled-button-container-shape-end-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-filled-button-leading-space, 24px);--_trailing-space: var(--md-filled-button-trailing-space, 24px);--_with-leading-icon-leading-space: var(--md-filled-button-with-leading-icon-leading-space, 16px);--_with-leading-icon-trailing-space: var(--md-filled-button-with-leading-icon-trailing-space, 24px);--_with-trailing-icon-leading-space: var(--md-filled-button-with-trailing-icon-leading-space, 24px);--_with-trailing-icon-trailing-space: var(--md-filled-button-with-trailing-icon-trailing-space, 16px)}
`;
  });
  let ns;
  const ss = d(() => {
    y();
    ns = x`md-elevation{transition-duration:280ms}:host(:is([disabled],[soft-disabled])) md-elevation{transition:none}md-elevation{--md-elevation-level: var(--_container-elevation);--md-elevation-shadow-color: var(--_container-shadow-color)}:host(:focus-within) md-elevation{--md-elevation-level: var(--_focus-container-elevation)}:host(:hover) md-elevation{--md-elevation-level: var(--_hover-container-elevation)}:host(:active) md-elevation{--md-elevation-level: var(--_pressed-container-elevation)}:host(:is([disabled],[soft-disabled])) md-elevation{--md-elevation-level: var(--_disabled-container-elevation)}
`;
  });
  let pt;
  const wo = d(() => {
    y();
    pt = x`:host{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end);box-sizing:border-box;cursor:pointer;display:inline-flex;gap:8px;min-height:var(--_container-height);outline:none;padding-block:calc((var(--_container-height) - max(var(--_label-text-line-height),var(--_icon-size)))/2);padding-inline-start:var(--_leading-space);padding-inline-end:var(--_trailing-space);place-content:center;place-items:center;position:relative;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);text-overflow:ellipsis;text-wrap:nowrap;user-select:none;-webkit-tap-highlight-color:rgba(0,0,0,0);vertical-align:top;--md-ripple-hover-color: var(--_hover-state-layer-color);--md-ripple-pressed-color: var(--_pressed-state-layer-color);--md-ripple-hover-opacity: var(--_hover-state-layer-opacity);--md-ripple-pressed-opacity: var(--_pressed-state-layer-opacity)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_container-shape-start-start);--md-focus-ring-shape-start-end: var(--_container-shape-start-end);--md-focus-ring-shape-end-end: var(--_container-shape-end-end);--md-focus-ring-shape-end-start: var(--_container-shape-end-start)}:host(:is([disabled],[soft-disabled])){cursor:default;pointer-events:none}.button{border-radius:inherit;cursor:inherit;display:inline-flex;align-items:center;justify-content:center;border:none;outline:none;-webkit-appearance:none;vertical-align:middle;background:rgba(0,0,0,0);text-decoration:none;min-width:calc(64px - var(--_leading-space) - var(--_trailing-space));width:100%;z-index:0;height:100%;font:inherit;color:var(--_label-text-color);padding:0;gap:inherit;text-transform:inherit}.button::-moz-focus-inner{padding:0;border:0}:host(:hover) .button{color:var(--_hover-label-text-color)}:host(:focus-within) .button{color:var(--_focus-label-text-color)}:host(:active) .button{color:var(--_pressed-label-text-color)}.background{background:var(--_container-color);border-radius:inherit;inset:0;position:absolute}.label{overflow:hidden}:is(.button,.label,.label slot),.label ::slotted(*){text-overflow:inherit}:host(:is([disabled],[soft-disabled])) .label{color:var(--_disabled-label-text-color);opacity:var(--_disabled-label-text-opacity)}:host(:is([disabled],[soft-disabled])) .background{background:var(--_disabled-container-color);opacity:var(--_disabled-container-opacity)}@media(forced-colors: active){.background{border:1px solid CanvasText}:host(:is([disabled],[soft-disabled])){--_disabled-icon-color: GrayText;--_disabled-icon-opacity: 1;--_disabled-container-opacity: 1;--_disabled-label-text-color: GrayText;--_disabled-label-text-opacity: 1}}:host([has-icon]:not([trailing-icon])){padding-inline-start:var(--_with-leading-icon-leading-space);padding-inline-end:var(--_with-leading-icon-trailing-space)}:host([has-icon][trailing-icon]){padding-inline-start:var(--_with-trailing-icon-leading-space);padding-inline-end:var(--_with-trailing-icon-trailing-space)}::slotted([slot=icon]){display:inline-flex;position:relative;writing-mode:horizontal-tb;fill:currentColor;flex-shrink:0;color:var(--_icon-color);font-size:var(--_icon-size);inline-size:var(--_icon-size);block-size:var(--_icon-size)}:host(:hover) ::slotted([slot=icon]){color:var(--_hover-icon-color)}:host(:focus-within) ::slotted([slot=icon]){color:var(--_focus-icon-color)}:host(:active) ::slotted([slot=icon]){color:var(--_pressed-icon-color)}:host(:is([disabled],[soft-disabled])) ::slotted([slot=icon]){color:var(--_disabled-icon-color);opacity:var(--_disabled-icon-opacity)}.touch{position:absolute;top:50%;height:48px;left:0;right:0;transform:translateY(-50%)}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_container-height))/2) 0}:host([touch-target=none]) .touch{display:none}
`;
  });
  let Wr;
  const as = d(() => {
    T();
    I();
    os();
    is();
    ss();
    wo();
    Wr = class extends _o {};
    Wr.styles = [pt, ns, rs];
    Wr = a([C("md-filled-button")], Wr);
  });
  let Eo;
  const ls = d(() => {
    y();
    xo();
    Eo = class extends W {
      renderElevationOrOutline() {
        return v`<div class="outline"></div>`;
      }
    };
  });
  let ds;
  const cs = d(() => {
    y();
    ds = x`:host{--_container-height: var(--md-outlined-button-container-height, 40px);--_disabled-label-text-color: var(--md-outlined-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-button-disabled-label-text-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-button-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-button-disabled-outline-opacity, 0.12);--_focus-label-text-color: var(--md-outlined-button-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-label-text-color: var(--md-outlined-button-hover-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-color: var(--md-outlined-button-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-opacity: var(--md-outlined-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-outlined-button-label-text-color, var(--md-sys-color-primary, #6750a4));--_label-text-font: var(--md-outlined-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-outlined-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-outlined-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_outline-color: var(--md-outlined-button-outline-color, var(--md-sys-color-outline, #79747e));--_outline-width: var(--md-outlined-button-outline-width, 1px);--_pressed-label-text-color: var(--md-outlined-button-pressed-label-text-color, var(--md-sys-color-primary, #6750a4));--_pressed-outline-color: var(--md-outlined-button-pressed-outline-color, var(--md-sys-color-outline, #79747e));--_pressed-state-layer-color: var(--md-outlined-button-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-opacity: var(--md-outlined-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-outlined-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-outlined-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-outlined-button-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_hover-icon-color: var(--md-outlined-button-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-color: var(--md-outlined-button-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-size: var(--md-outlined-button-icon-size, 18px);--_pressed-icon-color: var(--md-outlined-button-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_container-shape-start-start: var(--md-outlined-button-container-shape-start-start, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-outlined-button-container-shape-start-end, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-outlined-button-container-shape-end-end, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-outlined-button-container-shape-end-start, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-outlined-button-leading-space, 24px);--_trailing-space: var(--md-outlined-button-trailing-space, 24px);--_with-leading-icon-leading-space: var(--md-outlined-button-with-leading-icon-leading-space, 16px);--_with-leading-icon-trailing-space: var(--md-outlined-button-with-leading-icon-trailing-space, 24px);--_with-trailing-icon-leading-space: var(--md-outlined-button-with-trailing-icon-leading-space, 24px);--_with-trailing-icon-trailing-space: var(--md-outlined-button-with-trailing-icon-trailing-space, 16px);--_container-color: none;--_disabled-container-color: none;--_disabled-container-opacity: 0}.outline{inset:0;border-style:solid;position:absolute;box-sizing:border-box;border-color:var(--_outline-color);border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}:host(:active) .outline{border-color:var(--_pressed-outline-color)}:host(:is([disabled],[soft-disabled])) .outline{border-color:var(--_disabled-outline-color);opacity:var(--_disabled-outline-opacity)}@media(forced-colors: active){:host(:is([disabled],[soft-disabled])) .background{border-color:GrayText}:host(:is([disabled],[soft-disabled])) .outline{opacity:1}}.outline,md-ripple{border-width:var(--_outline-width)}md-ripple{inline-size:calc(100% - 2*var(--_outline-width));block-size:calc(100% - 2*var(--_outline-width));border-style:solid;border-color:rgba(0,0,0,0)}
`;
  });
  let jr;
  const ps = d(() => {
    T();
    I();
    ls();
    cs();
    wo();
    jr = class extends Eo {};
    jr.styles = [pt, ds];
    jr = a([C("md-outlined-button")], jr);
  });
  let Ao;
  const us = d(() => {
    xo();
    Ao = class extends W {};
  });
  let hs;
  const ms = d(() => {
    y();
    hs = x`:host{--_container-height: var(--md-text-button-container-height, 40px);--_disabled-label-text-color: var(--md-text-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-text-button-disabled-label-text-opacity, 0.38);--_focus-label-text-color: var(--md-text-button-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-label-text-color: var(--md-text-button-hover-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-color: var(--md-text-button-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-opacity: var(--md-text-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-text-button-label-text-color, var(--md-sys-color-primary, #6750a4));--_label-text-font: var(--md-text-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-text-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-text-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-text-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-label-text-color: var(--md-text-button-pressed-label-text-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-color: var(--md-text-button-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-opacity: var(--md-text-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-text-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-text-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-text-button-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_hover-icon-color: var(--md-text-button-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-color: var(--md-text-button-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-size: var(--md-text-button-icon-size, 18px);--_pressed-icon-color: var(--md-text-button-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_container-shape-start-start: var(--md-text-button-container-shape-start-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-text-button-container-shape-start-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-text-button-container-shape-end-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-text-button-container-shape-end-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-text-button-leading-space, 12px);--_trailing-space: var(--md-text-button-trailing-space, 12px);--_with-leading-icon-leading-space: var(--md-text-button-with-leading-icon-leading-space, 12px);--_with-leading-icon-trailing-space: var(--md-text-button-with-leading-icon-trailing-space, 16px);--_with-trailing-icon-leading-space: var(--md-text-button-with-trailing-icon-leading-space, 16px);--_with-trailing-icon-trailing-space: var(--md-text-button-with-trailing-icon-trailing-space, 12px);--_container-color: none;--_disabled-container-color: none;--_disabled-container-opacity: 0}
`;
  });
  let Kr;
  const fs = d(() => {
    T();
    I();
    wo();
    us();
    ms();
    Kr = class extends Ao {};
    Kr.styles = [pt, hs];
    Kr = a([C("md-text-button")], Kr);
  });
  let Co;
  const vs = d(() => {
    y();
    Co = class extends E {
      render() {
        return v`<slot></slot>`;
      }

      connectedCallback() {
        if (
          (super.connectedCallback(),
          this.getAttribute("aria-hidden") === "false")
        ) {
          this.removeAttribute("aria-hidden");
          return;
        }
        this.setAttribute("aria-hidden", "true");
      }
    };
  });
  let gs;
  const ys = d(() => {
    y();
    gs = x`:host{font-size:var(--md-icon-size, 24px);width:var(--md-icon-size, 24px);height:var(--md-icon-size, 24px);color:inherit;font-variation-settings:inherit;font-weight:400;font-family:var(--md-icon-font, Material Symbols Outlined);display:inline-flex;font-style:normal;place-items:center;place-content:center;line-height:1;overflow:hidden;letter-spacing:normal;text-transform:none;user-select:none;white-space:nowrap;word-wrap:normal;flex-shrink:0;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale}::slotted(svg){fill:currentColor}::slotted(*){height:100%;width:100%}
`;
  });
  let Gr;
  const bs = d(() => {
    T();
    I();
    vs();
    ys();
    Gr = class extends Co {};
    Gr.styles = [gs];
    Gr = a([C("md-icon")], Gr);
  });
  let _s;
  let sc;
  let ne;
  let xs;
  let Yr;
  let Me;
  let Gm;
  let Ym;
  const ws = d(() => {
    Ee();
    ((_s = Symbol.for("")),
      (sc = (o) => {
        if (o?.r === _s) return o?._$litStatic$;
      }),
      (ne = (o, ...e) => ({
        _$litStatic$: e.reduce(
          (t, r, i) =>
            t +
            ((n) => {
              if (n._$litStatic$ !== void 0) return n._$litStatic$;
              throw Error(`Value passed to 'literal' function must be a 'literal' result: ${n}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`);
            })(r) +
            o[i + 1],
          o[0],
        ),
        r: _s,
      })),
      (xs = new Map()),
      (Yr =
        (o) =>
        (e, ...t) => {
          const r = t.length;
          let i;
          let n;
          const s = [];
          const l = [];
          let c;
          let m = 0;
          let f = !1;
          for (; m < r; ) {
            for (c = e[m]; m < r && ((n = t[m]), (i = sc(n)) !== void 0); )
              ((c += i + e[++m]), (f = !0));
            (m !== r && l.push(n), s.push(c), m++);
          }
          if ((m === r && s.push(e[r]), f)) {
            const h = s.join("$$lit$$");
            ((e = xs.get(h)) === void 0 && ((s.raw = s), xs.set(h, (e = s))),
              (t = l));
          }
          return o(e, ...t);
        }),
      (Me = Yr(v)),
      (Gm = Yr(Rn)),
      (Ym = Yr(On)));
  });
  const De = d(() => {
    ws();
  });
  function Xr(o, e = !0) {
    return (
      e && getComputedStyle(o).getPropertyValue("direction").trim() === "rtl"
    );
  }
  const Es = d(() => {});
  let ac;
  let G;
  const As = d(() => {
    T();
    dt();
    zt();
    y();
    I();
    ge();
    De();
    ke();
    qr();
    Es();
    Ae();
    ((ac = oe(Le(E))),
      (G = class extends ac {
        get name() {
          return this.getAttribute("name") ?? "";
        }

        set name(e) {
          this.setAttribute("name", e);
        }

        get form() {
          return this[j].form;
        }

        get labels() {
          return this[j].labels;
        }

        constructor() {
          (super(),
            (this.disabled = !1),
            (this.softDisabled = !1),
            (this.flipIconInRtl = !1),
            (this.href = ""),
            (this.download = ""),
            (this.target = ""),
            (this.ariaLabelSelected = ""),
            (this.toggle = !1),
            (this.selected = !1),
            (this.type = "submit"),
            (this.value = ""),
            (this.flipIcon = Xr(this, this.flipIconInRtl)),
            this.addEventListener("click", this.handleClick.bind(this)));
        }

        willUpdate() {
          this.href && ((this.disabled = !1), (this.softDisabled = !1));
        }

        render() {
          const e = this.href ? ne`div` : ne`button`;
          const { ariaLabel: t, ariaHasPopup: r, ariaExpanded: i } = this;
          const n = t && this.ariaLabelSelected;
          const s = this.toggle ? this.selected : u;
          let l = u;
          return (
            this.href || (l = n && this.selected ? this.ariaLabelSelected : t),
            Me`<${e}
        class="icon-button ${K(this.getRenderClasses())}"
        id="button"
        aria-label="${l || u}"
        aria-haspopup="${(!this.href && r) || u}"
        aria-expanded="${(!this.href && i) || u}"
        aria-pressed="${s}"
        aria-disabled=${(!this.href && this.softDisabled) || u}
        ?disabled="${!this.href && this.disabled}"
        @click="${this.handleClickOnChild}">
        ${this.renderFocusRing()}
        ${this.renderRipple()}
        ${this.selected ? u : this.renderIcon()}
        ${this.selected ? this.renderSelectedIcon() : u}
        ${this.href ? this.renderLink() : this.renderTouchTarget()}
  </${e}>`
          );
        }

        renderLink() {
          const { ariaLabel: e } = this;
          return v`
      <a
        class="link"
        id="link"
        href="${this.href}"
        download="${this.download || u}"
        target="${this.target || u}"
        aria-label="${e || u}">
        ${this.renderTouchTarget()}
      </a>
    `;
        }

        getRenderClasses() {
          return {
            "flip-icon": this.flipIcon,
            selected: this.toggle && this.selected,
          };
        }

        renderIcon() {
          return v`<span class="icon"><slot></slot></span>`;
        }

        renderSelectedIcon() {
          return v`<span class="icon icon--selected"
      ><slot name="selected"><slot></slot></slot
    ></span>`;
        }

        renderTouchTarget() {
          return v`<span class="touch"></span>`;
        }

        renderFocusRing() {
          return v`<md-focus-ring
      part="focus-ring"
      for=${this.href ? "link" : "button"}></md-focus-ring>`;
        }

        renderRipple() {
          const e = !this.href && (this.disabled || this.softDisabled);
          return v`<md-ripple
      for=${this.href ? "link" : u}
      ?disabled="${e}"></md-ripple>`;
        }

        connectedCallback() {
          ((this.flipIcon = Xr(this, this.flipIconInRtl)),
            super.connectedCallback());
        }

        handleClick(e) {
          if (!this.href && this.softDisabled) {
            (e.stopImmediatePropagation(), e.preventDefault());
          }
        }

        async handleClickOnChild(e) {
          (await 0,
            !(
              !this.toggle ||
              this.disabled ||
              this.softDisabled ||
              e.defaultPrevented
            ) &&
              ((this.selected = !this.selected),
              this.dispatchEvent(
                new InputEvent("input", { bubbles: !0, composed: !0 }),
              ),
              this.dispatchEvent(new Event("change", { bubbles: !0 }))));
        }
      }));
    bo(G);
    G.formAssociated = !0;
    G.shadowRootOptions = { mode: "open", delegatesFocus: !0 };
    a([p({ type: Boolean, reflect: !0 })], G.prototype, "disabled", void 0);
    a(
      [p({ type: Boolean, attribute: "soft-disabled", reflect: !0 })],
      G.prototype,
      "softDisabled",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "flip-icon-in-rtl" })],
      G.prototype,
      "flipIconInRtl",
      void 0,
    );
    a([p()], G.prototype, "href", void 0);
    a([p()], G.prototype, "download", void 0);
    a([p()], G.prototype, "target", void 0);
    a(
      [p({ attribute: "aria-label-selected" })],
      G.prototype,
      "ariaLabelSelected",
      void 0,
    );
    a([p({ type: Boolean })], G.prototype, "toggle", void 0);
    a([p({ type: Boolean, reflect: !0 })], G.prototype, "selected", void 0);
    a([p()], G.prototype, "type", void 0);
    a([p({ reflect: !0 })], G.prototype, "value", void 0);
    a([M()], G.prototype, "flipIcon", void 0);
  });
  let Cs;
  const Ts = d(() => {
    y();
    Cs = x`:host{display:inline-flex;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0);height:var(--_container-height);width:var(--_container-width);justify-content:center}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_container-height))/2) max(0px,(48px - var(--_container-width))/2)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_container-shape-start-start);--md-focus-ring-shape-start-end: var(--_container-shape-start-end);--md-focus-ring-shape-end-end: var(--_container-shape-end-end);--md-focus-ring-shape-end-start: var(--_container-shape-end-start)}:host(:is([disabled],[soft-disabled])){pointer-events:none}.icon-button{place-items:center;background:none;border:none;box-sizing:border-box;cursor:pointer;display:flex;place-content:center;outline:none;padding:0;position:relative;text-decoration:none;user-select:none;z-index:0;flex:1;border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}.icon ::slotted(*){font-size:var(--_icon-size);height:var(--_icon-size);width:var(--_icon-size);font-weight:inherit}md-ripple{z-index:-1;border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}.flip-icon .icon{transform:scaleX(-1)}.icon{display:inline-flex}.link{display:grid;height:100%;outline:none;place-items:center;position:absolute;width:100%}.touch{position:absolute;height:max(48px,100%);width:max(48px,100%)}:host([touch-target=none]) .touch{display:none}@media(forced-colors: active){:host(:is([disabled],[soft-disabled])){--_disabled-icon-color: GrayText;--_disabled-icon-opacity: 1}}
`;
  });
  let Is;
  const Ss = d(() => {
    y();
    Is = x`:host{--_disabled-icon-color: var(--md-icon-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-icon-button-disabled-icon-opacity, 0.38);--_icon-size: var(--md-icon-button-icon-size, 24px);--_selected-focus-icon-color: var(--md-icon-button-selected-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-icon-color: var(--md-icon-button-selected-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-state-layer-color: var(--md-icon-button-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-state-layer-opacity: var(--md-icon-button-selected-hover-state-layer-opacity, 0.08);--_selected-icon-color: var(--md-icon-button-selected-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-icon-color: var(--md-icon-button-selected-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-state-layer-color: var(--md-icon-button-selected-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-state-layer-opacity: var(--md-icon-button-selected-pressed-state-layer-opacity, 0.12);--_state-layer-height: var(--md-icon-button-state-layer-height, 40px);--_state-layer-shape: var(--md-icon-button-state-layer-shape, var(--md-sys-shape-corner-full, 9999px));--_state-layer-width: var(--md-icon-button-state-layer-width, 40px);--_focus-icon-color: var(--md-icon-button-focus-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-icon-color: var(--md-icon-button-hover-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-icon-button-hover-state-layer-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-opacity: var(--md-icon-button-hover-state-layer-opacity, 0.08);--_icon-color: var(--md-icon-button-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-icon-color: var(--md-icon-button-pressed-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-state-layer-color: var(--md-icon-button-pressed-state-layer-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-state-layer-opacity: var(--md-icon-button-pressed-state-layer-opacity, 0.12);--_container-shape-start-start: 0;--_container-shape-start-end: 0;--_container-shape-end-end: 0;--_container-shape-end-start: 0;--_container-height: 0;--_container-width: 0;height:var(--_state-layer-height);width:var(--_state-layer-width)}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_state-layer-height))/2) max(0px,(48px - var(--_state-layer-width))/2)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_state-layer-shape);--md-focus-ring-shape-start-end: var(--_state-layer-shape);--md-focus-ring-shape-end-end: var(--_state-layer-shape);--md-focus-ring-shape-end-start: var(--_state-layer-shape)}.standard{background-color:rgba(0,0,0,0);color:var(--_icon-color);--md-ripple-hover-color: var(--_hover-state-layer-color);--md-ripple-hover-opacity: var(--_hover-state-layer-opacity);--md-ripple-pressed-color: var(--_pressed-state-layer-color);--md-ripple-pressed-opacity: var(--_pressed-state-layer-opacity)}.standard:hover{color:var(--_hover-icon-color)}.standard:focus{color:var(--_focus-icon-color)}.standard:active{color:var(--_pressed-icon-color)}.standard:is(:disabled,[aria-disabled=true]){color:var(--_disabled-icon-color)}md-ripple{border-radius:var(--_state-layer-shape)}.standard:is(:disabled,[aria-disabled=true]){opacity:var(--_disabled-icon-opacity)}.selected:not(:disabled,[aria-disabled=true]){color:var(--_selected-icon-color)}.selected:not(:disabled,[aria-disabled=true]):hover{color:var(--_selected-hover-icon-color)}.selected:not(:disabled,[aria-disabled=true]):focus{color:var(--_selected-focus-icon-color)}.selected:not(:disabled,[aria-disabled=true]):active{color:var(--_selected-pressed-icon-color)}.selected{--md-ripple-hover-color: var(--_selected-hover-state-layer-color);--md-ripple-hover-opacity: var(--_selected-hover-state-layer-opacity);--md-ripple-pressed-color: var(--_selected-pressed-state-layer-color);--md-ripple-pressed-opacity: var(--_selected-pressed-state-layer-opacity)}
`;
  });
  let Zr;
  const $s = d(() => {
    T();
    I();
    As();
    Ts();
    Ss();
    Zr = class extends G {
      getRenderClasses() {
        return { ...super.getRenderClasses(), standard: !0 };
      }
    };
    Zr.styles = [Cs, Is];
    Zr = a([C("md-icon-button")], Zr);
  });
  let N;
  const Rs = d(() => {
    T();
    y();
    I();
    ge();
    Dt();
    N = class extends E {
      constructor() {
        (super(...arguments),
          (this.disabled = !1),
          (this.error = !1),
          (this.focused = !1),
          (this.label = ""),
          (this.noAsterisk = !1),
          (this.populated = !1),
          (this.required = !1),
          (this.resizable = !1),
          (this.supportingText = ""),
          (this.errorText = ""),
          (this.count = -1),
          (this.max = -1),
          (this.hasStart = !1),
          (this.hasEnd = !1),
          (this.isAnimating = !1),
          (this.refreshErrorAlert = !1),
          (this.disableTransitions = !1));
      }

      get counterText() {
        const e = this.count ?? -1;
        const t = this.max ?? -1;
        return e < 0 || t <= 0 ? "" : `${e} / ${t}`;
      }

      get supportingOrErrorText() {
        return this.error && this.errorText
          ? this.errorText
          : this.supportingText;
      }

      reannounceError() {
        this.refreshErrorAlert = !0;
      }

      update(e) {
        (e.has("disabled") &&
          e.get("disabled") !== void 0 &&
          (this.disableTransitions = !0),
          this.disabled &&
            this.focused &&
            (e.set("focused", !0), (this.focused = !1)),
          this.animateLabelIfNeeded({
            wasFocused: e.get("focused"),
            wasPopulated: e.get("populated"),
          }),
          super.update(e));
      }

      render() {
        const e = this.renderLabel(!0);
        const t = this.renderLabel(!1);
        const r = this.renderOutline?.(e);
        const i = {
          disabled: this.disabled,
          "disable-transitions": this.disableTransitions,
          error: this.error && !this.disabled,
          focused: this.focused,
          "with-start": this.hasStart,
          "with-end": this.hasEnd,
          populated: this.populated,
          resizable: this.resizable,
          required: this.required,
          "no-label": !this.label,
        };
        return v`
      <div class="field ${K(i)}">
        <div class="container-overflow">
          ${this.renderBackground?.()}
          <slot name="container"></slot>
          ${this.renderStateLayer?.()} ${this.renderIndicator?.()} ${r}
          <div class="container">
            <div class="start">
              <slot name="start"></slot>
            </div>
            <div class="middle">
              <div class="label-wrapper">
                ${t} ${r ? u : e}
              </div>
              <div class="content">
                <slot></slot>
              </div>
            </div>
            <div class="end">
              <slot name="end"></slot>
            </div>
          </div>
        </div>
        ${this.renderSupportingText()}
      </div>
    `;
      }

      updated(e) {
        ((e.has("supportingText") ||
          e.has("errorText") ||
          e.has("count") ||
          e.has("max")) &&
          this.updateSlottedAriaDescribedBy(),
          this.refreshErrorAlert &&
            requestAnimationFrame(() => {
              this.refreshErrorAlert = !1;
            }),
          this.disableTransitions &&
            requestAnimationFrame(() => {
              this.disableTransitions = !1;
            }));
      }

      renderSupportingText() {
        const { supportingOrErrorText: e, counterText: t } = this;
        if (!e && !t) return u;
        const r = v`<span>${e}</span>`;
        const i = t ? v`<span class="counter">${t}</span>` : u;
        const s =
          this.error && this.errorText && !this.refreshErrorAlert ? "alert" : u;
        return v`
      <div class="supporting-text" role=${s}>${r}${i}</div>
      <slot
        name="aria-describedby"
        @slotchange=${this.updateSlottedAriaDescribedBy}></slot>
    `;
      }

      updateSlottedAriaDescribedBy() {
        for (const e of this.slottedAriaDescribedBy)
          (st(v`${this.supportingOrErrorText} ${this.counterText}`, e),
            e.setAttribute("hidden", ""));
      }

      renderLabel(e) {
        if (!this.label) return u;
        let t;
        e
          ? (t = this.focused || this.populated || this.isAnimating)
          : (t = !this.focused && !this.populated && !this.isAnimating);
        const r = { hidden: !t, floating: e, resting: !e };
        const i = `${this.label}${this.required && !this.noAsterisk ? "*" : ""}`;
        return v`
      <span class="label ${K(r)}" aria-hidden=${!t}
        >${i}</span
      >
    `;
      }

      animateLabelIfNeeded({ wasFocused: e, wasPopulated: t }) {
        if (!this.label) return;
        (e ?? (e = this.focused), t ?? (t = this.populated));
        const r = e || t;
        const i = this.focused || this.populated;
        r !== i &&
          ((this.isAnimating = !0),
          this.labelAnimation?.cancel(),
          (this.labelAnimation = this.floatingLabelEl?.animate(
            this.getLabelKeyframes(),
            { duration: 150, easing: te.STANDARD },
          )),
          this.labelAnimation?.addEventListener("finish", () => {
            this.isAnimating = !1;
          }));
      }

      getLabelKeyframes() {
        const { floatingLabelEl: e, restingLabelEl: t } = this;
        if (!e || !t) return [];
        const { x: r, y: i, height: n } = e.getBoundingClientRect();
        const { x: s, y: l, height: c } = t.getBoundingClientRect();
        const m = e.scrollWidth;
        const f = t.scrollWidth;
        const h = f / m;
        const b = s - r;
        const _ = l - i + Math.round((c - n * h) / 2);
        const P = `translateX(${b}px) translateY(${_}px) scale(${h})`;
        const $ = "translateX(0) translateY(0) scale(1)";
        const D = t.clientWidth;
        const w = f > D ? `${D / h}px` : "";
        return this.focused || this.populated
          ? [
              { transform: P, width: w },
              { transform: $, width: w },
            ]
          : [
              { transform: $, width: w },
              { transform: P, width: w },
            ];
      }

      getSurfacePositionClientRect() {
        return this.containerEl.getBoundingClientRect();
      }
    };
    a([p({ type: Boolean })], N.prototype, "disabled", void 0);
    a([p({ type: Boolean })], N.prototype, "error", void 0);
    a([p({ type: Boolean })], N.prototype, "focused", void 0);
    a([p()], N.prototype, "label", void 0);
    a(
      [p({ type: Boolean, attribute: "no-asterisk" })],
      N.prototype,
      "noAsterisk",
      void 0,
    );
    a([p({ type: Boolean })], N.prototype, "populated", void 0);
    a([p({ type: Boolean })], N.prototype, "required", void 0);
    a([p({ type: Boolean })], N.prototype, "resizable", void 0);
    a(
      [p({ attribute: "supporting-text" })],
      N.prototype,
      "supportingText",
      void 0,
    );
    a([p({ attribute: "error-text" })], N.prototype, "errorText", void 0);
    a([p({ type: Number })], N.prototype, "count", void 0);
    a([p({ type: Number })], N.prototype, "max", void 0);
    a(
      [p({ type: Boolean, attribute: "has-start" })],
      N.prototype,
      "hasStart",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "has-end" })],
      N.prototype,
      "hasEnd",
      void 0,
    );
    a(
      [Z({ slot: "aria-describedby" })],
      N.prototype,
      "slottedAriaDescribedBy",
      void 0,
    );
    a([M()], N.prototype, "isAnimating", void 0);
    a([M()], N.prototype, "refreshErrorAlert", void 0);
    a([M()], N.prototype, "disableTransitions", void 0);
    a([S(".label.floating")], N.prototype, "floatingLabelEl", void 0);
    a([S(".label.resting")], N.prototype, "restingLabelEl", void 0);
    a([S(".container")], N.prototype, "containerEl", void 0);
  });
  let To;
  const Os = d(() => {
    y();
    Rs();
    To = class extends N {
      renderOutline(e) {
        return v`
      <div class="outline">
        <div class="outline-start"></div>
        <div class="outline-notch">
          <div class="outline-panel-inactive"></div>
          <div class="outline-panel-active"></div>
          <div class="outline-label">${e}</div>
        </div>
        <div class="outline-end"></div>
      </div>
    `;
      }
    };
  });
  let Ps;
  const ks = d(() => {
    y();
    Ps = x`@layer styles{:host{--_bottom-space: var(--md-outlined-field-bottom-space, 16px);--_content-color: var(--md-outlined-field-content-color, var(--md-sys-color-on-surface, #1d1b20));--_content-font: var(--md-outlined-field-content-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_content-line-height: var(--md-outlined-field-content-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_content-size: var(--md-outlined-field-content-size, var(--md-sys-typescale-body-large-size, 1rem));--_content-space: var(--md-outlined-field-content-space, 16px);--_content-weight: var(--md-outlined-field-content-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_disabled-content-color: var(--md-outlined-field-disabled-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-content-opacity: var(--md-outlined-field-disabled-content-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-field-disabled-label-text-opacity, 0.38);--_disabled-leading-content-color: var(--md-outlined-field-disabled-leading-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-content-opacity: var(--md-outlined-field-disabled-leading-content-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-content-color: var(--md-outlined-field-disabled-trailing-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-content-opacity: var(--md-outlined-field-disabled-trailing-content-opacity, 0.38);--_error-content-color: var(--md-outlined-field-error-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-content-color: var(--md-outlined-field-error-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-content-color: var(--md-outlined-field-error-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-content-color: var(--md-outlined-field-error-focus-trailing-content-color, var(--md-sys-color-error, #b3261e));--_error-hover-content-color: var(--md-outlined-field-error-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-content-color: var(--md-outlined-field-error-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-content-color: var(--md-outlined-field-error-hover-trailing-content-color, var(--md-sys-color-on-error-container, #410e0b));--_error-label-text-color: var(--md-outlined-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-content-color: var(--md-outlined-field-error-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-content-color: var(--md-outlined-field-error-trailing-content-color, var(--md-sys-color-error, #b3261e));--_focus-content-color: var(--md-outlined-field-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-content-color: var(--md-outlined-field-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-content-color: var(--md-outlined-field-focus-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-content-color: var(--md-outlined-field-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-content-color: var(--md-outlined-field-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-content-color: var(--md-outlined-field-hover-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-color: var(--md-outlined-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-padding-bottom: var(--md-outlined-field-label-text-padding-bottom, 8px);--_label-text-populated-line-height: var(--md-outlined-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-content-color: var(--md-outlined-field-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-space: var(--md-outlined-field-leading-space, 16px);--_outline-color: var(--md-outlined-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-label-padding: var(--md-outlined-field-outline-label-padding, 4px);--_outline-width: var(--md-outlined-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-leading-space: var(--md-outlined-field-supporting-text-leading-space, 16px);--_supporting-text-line-height: var(--md-outlined-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-top-space: var(--md-outlined-field-supporting-text-top-space, 4px);--_supporting-text-trailing-space: var(--md-outlined-field-supporting-text-trailing-space, 16px);--_supporting-text-weight: var(--md-outlined-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_top-space: var(--md-outlined-field-top-space, 16px);--_trailing-content-color: var(--md-outlined-field-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-space: var(--md-outlined-field-trailing-space, 16px);--_with-leading-content-leading-space: var(--md-outlined-field-with-leading-content-leading-space, 12px);--_with-trailing-content-trailing-space: var(--md-outlined-field-with-trailing-content-trailing-space, 12px);--_container-shape-start-start: var(--md-outlined-field-container-shape-start-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-field-container-shape-start-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-field-container-shape-end-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-field-container-shape-end-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)))}.outline{border-color:var(--_outline-color);border-radius:inherit;display:flex;pointer-events:none;height:100%;position:absolute;width:100%;z-index:1}.outline-start::before,.outline-start::after,.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after,.outline-end::before,.outline-end::after{border:inherit;content:"";inset:0;position:absolute}.outline-start,.outline-end{border:inherit;border-radius:inherit;box-sizing:border-box;position:relative}.outline-start::before,.outline-start::after,.outline-end::before,.outline-end::after{border-bottom-style:solid;border-top-style:solid}.outline-start::after,.outline-end::after{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-start::after,.focused .outline-end::after{opacity:1}.outline-start::before,.outline-start::after{border-inline-start-style:solid;border-inline-end-style:none;border-start-start-radius:inherit;border-start-end-radius:0;border-end-start-radius:inherit;border-end-end-radius:0;margin-inline-end:var(--_outline-label-padding)}.outline-end{flex-grow:1;margin-inline-start:calc(-1*var(--_outline-label-padding))}.outline-end::before,.outline-end::after{border-inline-start-style:none;border-inline-end-style:solid;border-start-start-radius:0;border-start-end-radius:inherit;border-end-start-radius:0;border-end-end-radius:inherit}.outline-notch{align-items:flex-start;border:inherit;display:flex;margin-inline-start:calc(-1*var(--_outline-label-padding));margin-inline-end:var(--_outline-label-padding);max-width:calc(100% - var(--_leading-space) - var(--_trailing-space));padding:0 var(--_outline-label-padding);position:relative}.no-label .outline-notch{display:none}.outline-panel-inactive,.outline-panel-active{border:inherit;border-bottom-style:solid;inset:0;position:absolute}.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after{border-top-style:solid;border-bottom:none;bottom:auto;transform:scaleX(1);transition:transform 150ms cubic-bezier(0.2, 0, 0, 1)}.outline-panel-inactive::before,.outline-panel-active::before{right:50%;transform-origin:top left}.outline-panel-inactive::after,.outline-panel-active::after{left:50%;transform-origin:top right}.populated .outline-panel-inactive::before,.populated .outline-panel-inactive::after,.populated .outline-panel-active::before,.populated .outline-panel-active::after,.focused .outline-panel-inactive::before,.focused .outline-panel-inactive::after,.focused .outline-panel-active::before,.focused .outline-panel-active::after{transform:scaleX(0)}.outline-panel-active{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-panel-active{opacity:1}.outline-label{display:flex;max-width:100%;transform:translateY(calc(-100% + var(--_label-text-padding-bottom)))}.outline-start,.field:not(.with-start) .content ::slotted(*){padding-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-start) .label-wrapper{margin-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-end) .content ::slotted(*){padding-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.field:not(.with-end) .label-wrapper{margin-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.outline-start::before,.outline-end::before,.outline-panel-inactive,.outline-panel-inactive::before,.outline-panel-inactive::after{border-width:var(--_outline-width)}:hover .outline{border-color:var(--_hover-outline-color);color:var(--_hover-outline-color)}:hover .outline-start::before,:hover .outline-end::before,:hover .outline-panel-inactive,:hover .outline-panel-inactive::before,:hover .outline-panel-inactive::after{border-width:var(--_hover-outline-width)}.focused .outline{border-color:var(--_focus-outline-color);color:var(--_focus-outline-color)}.outline-start::after,.outline-end::after,.outline-panel-active,.outline-panel-active::before,.outline-panel-active::after{border-width:var(--_focus-outline-width)}.disabled .outline{border-color:var(--_disabled-outline-color);color:var(--_disabled-outline-color)}.disabled .outline-start,.disabled .outline-end,.disabled .outline-panel-inactive{opacity:var(--_disabled-outline-opacity)}.disabled .outline-start::before,.disabled .outline-end::before,.disabled .outline-panel-inactive,.disabled .outline-panel-inactive::before,.disabled .outline-panel-inactive::after{border-width:var(--_disabled-outline-width)}.error .outline{border-color:var(--_error-outline-color);color:var(--_error-outline-color)}.error:hover .outline{border-color:var(--_error-hover-outline-color);color:var(--_error-hover-outline-color)}.error.focused .outline{border-color:var(--_error-focus-outline-color);color:var(--_error-focus-outline-color)}.resizable .container{bottom:var(--_focus-outline-width);inset-inline-end:var(--_focus-outline-width);clip-path:inset(var(--_focus-outline-width) 0 0 var(--_focus-outline-width))}.resizable .container>*{top:var(--_focus-outline-width);inset-inline-start:var(--_focus-outline-width)}.resizable .container:dir(rtl){clip-path:inset(var(--_focus-outline-width) var(--_focus-outline-width) 0 0)}}@layer hcm{@media(forced-colors: active){.disabled .outline{border-color:GrayText;color:GrayText}.disabled :is(.outline-start,.outline-end,.outline-panel-inactive){opacity:1}}}
`;
  });
  let Ls;
  const Ms = d(() => {
    y();
    Ls = x`:host{display:inline-flex;resize:both}.field{display:flex;flex:1;flex-direction:column;writing-mode:horizontal-tb;max-width:100%}.container-overflow{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-end-radius:var(--_container-shape-end-end);border-end-start-radius:var(--_container-shape-end-start);display:flex;height:100%;position:relative}.container{align-items:center;border-radius:inherit;display:flex;flex:1;max-height:100%;min-height:100%;min-width:min-content;position:relative}.field,.container-overflow{resize:inherit}.resizable:not(.disabled) .container{resize:inherit;overflow:hidden}.disabled{pointer-events:none}slot[name=container]{border-radius:inherit}slot[name=container]::slotted(*){border-radius:inherit;inset:0;pointer-events:none;position:absolute}@layer styles{.start,.middle,.end{display:flex;box-sizing:border-box;height:100%;position:relative}.start{color:var(--_leading-content-color)}.end{color:var(--_trailing-content-color)}.start,.end{align-items:center;justify-content:center}.with-start .start{margin-inline:var(--_with-leading-content-leading-space) var(--_content-space)}.with-end .end{margin-inline:var(--_content-space) var(--_with-trailing-content-trailing-space)}.middle{align-items:stretch;align-self:baseline;flex:1}.content{color:var(--_content-color);display:flex;flex:1;opacity:0;transition:opacity 83ms cubic-bezier(0.2, 0, 0, 1)}.no-label .content,.focused .content,.populated .content{opacity:1;transition-delay:67ms}:is(.disabled,.disable-transitions) .content{transition:none}.content ::slotted(*){all:unset;color:currentColor;font-family:var(--_content-font);font-size:var(--_content-size);line-height:var(--_content-line-height);font-weight:var(--_content-weight);width:100%;overflow-wrap:revert;white-space:revert}.content ::slotted(:not(textarea)){padding-top:var(--_top-space);padding-bottom:var(--_bottom-space)}.content ::slotted(textarea){margin-top:var(--_top-space);margin-bottom:var(--_bottom-space)}:hover .content{color:var(--_hover-content-color)}:hover .start{color:var(--_hover-leading-content-color)}:hover .end{color:var(--_hover-trailing-content-color)}.focused .content{color:var(--_focus-content-color)}.focused .start{color:var(--_focus-leading-content-color)}.focused .end{color:var(--_focus-trailing-content-color)}.disabled .content{color:var(--_disabled-content-color)}.disabled.no-label .content,.disabled.focused .content,.disabled.populated .content{opacity:var(--_disabled-content-opacity)}.disabled .start{color:var(--_disabled-leading-content-color);opacity:var(--_disabled-leading-content-opacity)}.disabled .end{color:var(--_disabled-trailing-content-color);opacity:var(--_disabled-trailing-content-opacity)}.error .content{color:var(--_error-content-color)}.error .start{color:var(--_error-leading-content-color)}.error .end{color:var(--_error-trailing-content-color)}.error:hover .content{color:var(--_error-hover-content-color)}.error:hover .start{color:var(--_error-hover-leading-content-color)}.error:hover .end{color:var(--_error-hover-trailing-content-color)}.error.focused .content{color:var(--_error-focus-content-color)}.error.focused .start{color:var(--_error-focus-leading-content-color)}.error.focused .end{color:var(--_error-focus-trailing-content-color)}}@layer hcm{@media(forced-colors: active){.disabled :is(.start,.content,.end){color:GrayText;opacity:1}}}@layer styles{.label{box-sizing:border-box;color:var(--_label-text-color);overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;z-index:1;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);width:min-content}.label-wrapper{inset:0;pointer-events:none;position:absolute}.label.resting{position:absolute;top:var(--_top-space)}.label.floating{font-size:var(--_label-text-populated-size);line-height:var(--_label-text-populated-line-height);transform-origin:top left}.label.hidden{opacity:0}.no-label .label{display:none}.label-wrapper{inset:0;position:absolute;text-align:initial}:hover .label{color:var(--_hover-label-text-color)}.focused .label{color:var(--_focus-label-text-color)}.disabled .label{color:var(--_disabled-label-text-color)}.disabled .label:not(.hidden){opacity:var(--_disabled-label-text-opacity)}.error .label{color:var(--_error-label-text-color)}.error:hover .label{color:var(--_error-hover-label-text-color)}.error.focused .label{color:var(--_error-focus-label-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .label:not(.hidden){color:GrayText;opacity:1}}}@layer styles{.supporting-text{color:var(--_supporting-text-color);display:flex;font-family:var(--_supporting-text-font);font-size:var(--_supporting-text-size);line-height:var(--_supporting-text-line-height);font-weight:var(--_supporting-text-weight);gap:16px;justify-content:space-between;padding-inline-start:var(--_supporting-text-leading-space);padding-inline-end:var(--_supporting-text-trailing-space);padding-top:var(--_supporting-text-top-space)}.supporting-text :nth-child(2){flex-shrink:0}:hover .supporting-text{color:var(--_hover-supporting-text-color)}.focus .supporting-text{color:var(--_focus-supporting-text-color)}.disabled .supporting-text{color:var(--_disabled-supporting-text-color);opacity:var(--_disabled-supporting-text-opacity)}.error .supporting-text{color:var(--_error-supporting-text-color)}.error:hover .supporting-text{color:var(--_error-hover-supporting-text-color)}.error.focus .supporting-text{color:var(--_error-focus-supporting-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .supporting-text{color:GrayText;opacity:1}}}
`;
  });
  let Jr;
  const Io = d(() => {
    T();
    I();
    Os();
    ks();
    Ms();
    Jr = class extends To {};
    Jr.styles = [Ls, Ps];
    Jr = a([C("md-outlined-field")], Jr);
  });
  let Ds;
  const zs = d(() => {
    y();
    Ds = x`:host{--_caret-color: var(--md-outlined-text-field-caret-color, var(--md-sys-color-primary, #6750a4));--_disabled-input-text-color: var(--md-outlined-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-input-text-opacity: var(--md-outlined-text-field-disabled-input-text-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-text-field-disabled-label-text-opacity, 0.38);--_disabled-leading-icon-color: var(--md-outlined-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-icon-opacity: var(--md-outlined-text-field-disabled-leading-icon-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-text-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-text-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-text-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-text-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-icon-color: var(--md-outlined-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-icon-opacity: var(--md-outlined-text-field-disabled-trailing-icon-opacity, 0.38);--_error-focus-caret-color: var(--md-outlined-text-field-error-focus-caret-color, var(--md-sys-color-error, #b3261e));--_error-focus-input-text-color: var(--md-outlined-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-icon-color: var(--md-outlined-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-text-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-icon-color: var(--md-outlined-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_error-hover-input-text-color: var(--md-outlined-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-icon-color: var(--md-outlined-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-text-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-icon-color: var(--md-outlined-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_error-input-text-color: var(--md-outlined-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-label-text-color: var(--md-outlined-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-icon-color: var(--md-outlined-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-text-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-icon-color: var(--md-outlined-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_focus-input-text-color: var(--md-outlined-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-icon-color: var(--md-outlined-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-text-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-text-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-icon-color: var(--md-outlined-text-field-focus-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-input-text-color: var(--md-outlined-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-icon-color: var(--md-outlined-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-text-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-text-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-icon-color: var(--md-outlined-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-color: var(--md-outlined-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_input-text-font: var(--md-outlined-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_input-text-line-height: var(--md-outlined-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_input-text-placeholder-color: var(--md-outlined-text-field-input-text-placeholder-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-prefix-color: var(--md-outlined-text-field-input-text-prefix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-size: var(--md-outlined-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_input-text-suffix-color: var(--md-outlined-text-field-input-text-suffix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-weight: var(--md-outlined-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_label-text-color: var(--md-outlined-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-outlined-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-icon-color: var(--md-outlined-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-icon-size: var(--md-outlined-text-field-leading-icon-size, 24px);--_outline-color: var(--md-outlined-text-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-width: var(--md-outlined-text-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-line-height: var(--md-outlined-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-weight: var(--md-outlined-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_trailing-icon-color: var(--md-outlined-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-icon-size: var(--md-outlined-text-field-trailing-icon-size, 24px);--_container-shape-start-start: var(--md-outlined-text-field-container-shape-start-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-text-field-container-shape-start-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-text-field-container-shape-end-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-text-field-container-shape-end-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_icon-input-space: var(--md-outlined-text-field-icon-input-space, 16px);--_leading-space: var(--md-outlined-text-field-leading-space, 16px);--_trailing-space: var(--md-outlined-text-field-trailing-space, 16px);--_top-space: var(--md-outlined-text-field-top-space, 16px);--_bottom-space: var(--md-outlined-text-field-bottom-space, 16px);--_input-text-prefix-trailing-space: var(--md-outlined-text-field-input-text-prefix-trailing-space, 2px);--_input-text-suffix-leading-space: var(--md-outlined-text-field-input-text-suffix-leading-space, 2px);--_focus-caret-color: var(--md-outlined-text-field-focus-caret-color, var(--md-sys-color-primary, #6750a4));--_with-leading-icon-leading-space: var(--md-outlined-text-field-with-leading-icon-leading-space, 12px);--_with-trailing-icon-trailing-space: var(--md-outlined-text-field-with-trailing-icon-trailing-space, 12px);--md-outlined-field-bottom-space: var(--_bottom-space);--md-outlined-field-container-shape-end-end: var(--_container-shape-end-end);--md-outlined-field-container-shape-end-start: var(--_container-shape-end-start);--md-outlined-field-container-shape-start-end: var(--_container-shape-start-end);--md-outlined-field-container-shape-start-start: var(--_container-shape-start-start);--md-outlined-field-content-color: var(--_input-text-color);--md-outlined-field-content-font: var(--_input-text-font);--md-outlined-field-content-line-height: var(--_input-text-line-height);--md-outlined-field-content-size: var(--_input-text-size);--md-outlined-field-content-space: var(--_icon-input-space);--md-outlined-field-content-weight: var(--_input-text-weight);--md-outlined-field-disabled-content-color: var(--_disabled-input-text-color);--md-outlined-field-disabled-content-opacity: var(--_disabled-input-text-opacity);--md-outlined-field-disabled-label-text-color: var(--_disabled-label-text-color);--md-outlined-field-disabled-label-text-opacity: var(--_disabled-label-text-opacity);--md-outlined-field-disabled-leading-content-color: var(--_disabled-leading-icon-color);--md-outlined-field-disabled-leading-content-opacity: var(--_disabled-leading-icon-opacity);--md-outlined-field-disabled-outline-color: var(--_disabled-outline-color);--md-outlined-field-disabled-outline-opacity: var(--_disabled-outline-opacity);--md-outlined-field-disabled-outline-width: var(--_disabled-outline-width);--md-outlined-field-disabled-supporting-text-color: var(--_disabled-supporting-text-color);--md-outlined-field-disabled-supporting-text-opacity: var(--_disabled-supporting-text-opacity);--md-outlined-field-disabled-trailing-content-color: var(--_disabled-trailing-icon-color);--md-outlined-field-disabled-trailing-content-opacity: var(--_disabled-trailing-icon-opacity);--md-outlined-field-error-content-color: var(--_error-input-text-color);--md-outlined-field-error-focus-content-color: var(--_error-focus-input-text-color);--md-outlined-field-error-focus-label-text-color: var(--_error-focus-label-text-color);--md-outlined-field-error-focus-leading-content-color: var(--_error-focus-leading-icon-color);--md-outlined-field-error-focus-outline-color: var(--_error-focus-outline-color);--md-outlined-field-error-focus-supporting-text-color: var(--_error-focus-supporting-text-color);--md-outlined-field-error-focus-trailing-content-color: var(--_error-focus-trailing-icon-color);--md-outlined-field-error-hover-content-color: var(--_error-hover-input-text-color);--md-outlined-field-error-hover-label-text-color: var(--_error-hover-label-text-color);--md-outlined-field-error-hover-leading-content-color: var(--_error-hover-leading-icon-color);--md-outlined-field-error-hover-outline-color: var(--_error-hover-outline-color);--md-outlined-field-error-hover-supporting-text-color: var(--_error-hover-supporting-text-color);--md-outlined-field-error-hover-trailing-content-color: var(--_error-hover-trailing-icon-color);--md-outlined-field-error-label-text-color: var(--_error-label-text-color);--md-outlined-field-error-leading-content-color: var(--_error-leading-icon-color);--md-outlined-field-error-outline-color: var(--_error-outline-color);--md-outlined-field-error-supporting-text-color: var(--_error-supporting-text-color);--md-outlined-field-error-trailing-content-color: var(--_error-trailing-icon-color);--md-outlined-field-focus-content-color: var(--_focus-input-text-color);--md-outlined-field-focus-label-text-color: var(--_focus-label-text-color);--md-outlined-field-focus-leading-content-color: var(--_focus-leading-icon-color);--md-outlined-field-focus-outline-color: var(--_focus-outline-color);--md-outlined-field-focus-outline-width: var(--_focus-outline-width);--md-outlined-field-focus-supporting-text-color: var(--_focus-supporting-text-color);--md-outlined-field-focus-trailing-content-color: var(--_focus-trailing-icon-color);--md-outlined-field-hover-content-color: var(--_hover-input-text-color);--md-outlined-field-hover-label-text-color: var(--_hover-label-text-color);--md-outlined-field-hover-leading-content-color: var(--_hover-leading-icon-color);--md-outlined-field-hover-outline-color: var(--_hover-outline-color);--md-outlined-field-hover-outline-width: var(--_hover-outline-width);--md-outlined-field-hover-supporting-text-color: var(--_hover-supporting-text-color);--md-outlined-field-hover-trailing-content-color: var(--_hover-trailing-icon-color);--md-outlined-field-label-text-color: var(--_label-text-color);--md-outlined-field-label-text-font: var(--_label-text-font);--md-outlined-field-label-text-line-height: var(--_label-text-line-height);--md-outlined-field-label-text-populated-line-height: var(--_label-text-populated-line-height);--md-outlined-field-label-text-populated-size: var(--_label-text-populated-size);--md-outlined-field-label-text-size: var(--_label-text-size);--md-outlined-field-label-text-weight: var(--_label-text-weight);--md-outlined-field-leading-content-color: var(--_leading-icon-color);--md-outlined-field-leading-space: var(--_leading-space);--md-outlined-field-outline-color: var(--_outline-color);--md-outlined-field-outline-width: var(--_outline-width);--md-outlined-field-supporting-text-color: var(--_supporting-text-color);--md-outlined-field-supporting-text-font: var(--_supporting-text-font);--md-outlined-field-supporting-text-line-height: var(--_supporting-text-line-height);--md-outlined-field-supporting-text-size: var(--_supporting-text-size);--md-outlined-field-supporting-text-weight: var(--_supporting-text-weight);--md-outlined-field-top-space: var(--_top-space);--md-outlined-field-trailing-content-color: var(--_trailing-icon-color);--md-outlined-field-trailing-space: var(--_trailing-space);--md-outlined-field-with-leading-content-leading-space: var(--_with-leading-icon-leading-space);--md-outlined-field-with-trailing-content-trailing-space: var(--_with-trailing-icon-trailing-space)}
`;
  });
  let Kf;
  let Bs;
  let lc;
  let Ns;
  const Fs = d(() => {
    Ee();
    (({ I: Kf } = Ln),
      (Bs = (o) => o.strings === void 0),
      (lc = {}),
      (Ns = (o, e = lc) => (o._$AH = e)));
  });
  let Qr;
  const Us = d(() => {
    Ee();
    vo();
    Fs();
    Qr = ct(
      class extends Oe {
        constructor(o) {
          if (
            (super(o),
            o.type !== pe.PROPERTY &&
              o.type !== pe.ATTRIBUTE &&
              o.type !== pe.BOOLEAN_ATTRIBUTE)
          )
            throw Error(
              "The `live` directive is not allowed on child or event bindings",
            );
          if (!Bs(o))
            throw Error("`live` bindings can only contain a single expression");
        }

        render(o) {
          return o;
        }

        update(o, [e]) {
          if (e === J || e === u) return e;
          const t = o.element;
          const r = o.name;
          if (o.type === pe.PROPERTY) {
            if (e === t[r]) return J;
          } else if (o.type === pe.BOOLEAN_ATTRIBUTE) {
            if (!!e === t.hasAttribute(r)) return J;
          } else if (o.type === pe.ATTRIBUTE && t.getAttribute(r) === `${e}`)
            return J;
          return (Ns(o), e);
        }
      },
    );
  });
  const Hs = d(() => {
    Us();
  });
  let qs;
  let dc;
  let Ye;
  const Vs = d(() => {
    Ee();
    vo();
    ((qs = "important"),
      (dc = ` !${qs}`),
      (Ye = ct(
        class extends Oe {
          constructor(o) {
            if (
              (super(o),
              o.type !== pe.ATTRIBUTE ||
                o.name !== "style" ||
                o.strings?.length > 2)
            )
              throw Error(
                "The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.",
              );
          }

          render(o) {
            return Object.keys(o).reduce((e, t) => {
              const r = o[t];
              return r == null
                ? e
                : `${
                    e
                  }${(t = t.includes("-") ? t : t.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase())}:${r};`;
            }, "");
          }

          update(o, [e]) {
            const { style: t } = o.element;
            if (this.ft === void 0)
              return ((this.ft = new Set(Object.keys(e))), this.render(e));
            for (const r of this.ft)
              e[r] == null &&
                (this.ft.delete(r),
                r.includes("-") ? t.removeProperty(r) : (t[r] = null));
            for (const r in e) {
              const i = e[r];
              if (i != null) {
                this.ft.add(r);
                const n = typeof i === "string" && i.endsWith(dc);
                r.includes("-") || n
                  ? t.setProperty(r, n ? i.slice(0, -11) : i, n ? qs : "")
                  : (t[r] = i);
              }
            }
            return J;
          }
        },
      )));
  });
  const So = d(() => {
    Vs();
  });
  let Ws;
  const js = d(() => {
    Ws = {
      fromAttribute(o) {
        return o ?? "";
      },
      toAttribute(o) {
        return o || null;
      },
    };
  });
  function ut(o, e) {
    e.bubbles && (!o.shadowRoot || e.composed) && e.stopPropagation();
    const t = Reflect.construct(e.constructor, [e.type, e]);
    const r = o.dispatchEvent(t);
    return (r || e.preventDefault(), r);
  }
  const $o = d(() => {});
  function Oo(o) {
    let e;
    class t extends o {
      constructor() {
        (super(...arguments), (this[e] = ""));
      }

      get validity() {
        return (this[Ce](), this[j].validity);
      }

      get validationMessage() {
        return (this[Ce](), this[j].validationMessage);
      }

      get willValidate() {
        return (this[Ce](), this[j].willValidate);
      }

      checkValidity() {
        return (this[Ce](), this[j].checkValidity());
      }

      reportValidity() {
        return (this[Ce](), this[j].reportValidity());
      }

      setCustomValidity(i) {
        ((this[Ro] = i), this[Ce]());
      }

      requestUpdate(i, n, s) {
        (super.requestUpdate(i, n, s), this[Ce]());
      }

      firstUpdated(i) {
        (super.firstUpdated(i), this[Ce]());
      }

      [((e = Ro), Ce)]() {
        if (!1) return;
        this[ei] || (this[ei] = this[ht]());
        const { validity: i, validationMessage: n } = this[ei].getValidity();
        const s = !!this[Ro];
        const l = this[Ro] || n;
        this[j].setValidity({ ...i, customError: s }, l, this[mt]() ?? void 0);
      }

      [ht]() {
        throw new Error("Implement [createValidator]");
      }

      [mt]() {
        throw new Error("Implement [getValidityAnchor]");
      }
    }
    return t;
  }
  let ht;
  let mt;
  let ei;
  let Ce;
  let Ro;
  const ti = d(() => {
    y();
    Ae();
    ((ht = Symbol("createValidator")),
      (mt = Symbol("getValidityAnchor")),
      (ei = Symbol("privateValidator")),
      (Ce = Symbol("privateSyncValidity")),
      (Ro = Symbol("privateCustomValidationMessage")));
  });
  function Po(o) {
    class e extends o {
      get form() {
        return this[j].form;
      }

      get labels() {
        return this[j].labels;
      }

      get name() {
        return this.getAttribute("name") ?? "";
      }

      set name(r) {
        this.setAttribute("name", r);
      }

      get disabled() {
        return this.hasAttribute("disabled");
      }

      set disabled(r) {
        this.toggleAttribute("disabled", r);
      }

      attributeChangedCallback(r, i, n) {
        if (r === "name" || r === "disabled") {
          const s = r === "disabled" ? i !== null : i;
          this.requestUpdate(r, s);
          return;
        }
        super.attributeChangedCallback(r, i, n);
      }

      requestUpdate(r, i, n) {
        (super.requestUpdate(r, i, n),
          this[j].setFormValue(this[Xe](), this[Ks]()));
      }

      [Xe]() {
        throw new Error("Implement [getFormValue]");
      }

      [Ks]() {
        return this[Xe]();
      }

      formDisabledCallback(r) {
        this.disabled = r;
      }
    }
    return (
      (e.formAssociated = !0),
      a([p({ noAccessor: !0 })], e.prototype, "name", null),
      a([p({ type: Boolean, noAccessor: !0 })], e.prototype, "disabled", null),
      e
    );
  }
  let Xe;
  let Ks;
  const oi = d(() => {
    T();
    I();
    Ae();
    ((Xe = Symbol("getFormValue")), (Ks = Symbol("getFormState")));
  });
  function zo(o) {
    let e;
    let t;
    let r;
    class i extends o {
      constructor(...s) {
        (super(...s),
          (this[e] = new AbortController()),
          (this[t] = !1),
          (this[r] = !1),
          !!1 &&
            this.addEventListener(
              "invalid",
              (l) => {
                this[Lo] ||
                  !l.isTrusted ||
                  this.addEventListener(
                    "invalid",
                    () => {
                      this[Do](l);
                    },
                    { once: !0 },
                  );
              },
              { capture: !0 },
            ));
      }

      checkValidity() {
        this[Lo] = !0;
        const s = super.checkValidity();
        return ((this[Lo] = !1), s);
      }

      reportValidity() {
        this[Mo] = !0;
        const s = super.reportValidity();
        return (s && this[Do](null), (this[Mo] = !1), s);
      }

      [((e = ko), (t = Lo), (r = Mo), Do)](s) {
        const l = s?.defaultPrevented;
        l ||
          (this[ft](s), !(!l && s?.defaultPrevented)) ||
          ((this[Mo] || uc(this[j].form, this)) && this.focus());
      }

      [ft](s) {
        throw new Error("Implement [onReportValidity]");
      }

      formAssociatedCallback(s) {
        (super.formAssociatedCallback && super.formAssociatedCallback(s),
          this[ko].abort(),
          s &&
            ((this[ko] = new AbortController()),
            cc(
              this,
              s,
              () => {
                this[Do](null);
              },
              this[ko].signal,
            )));
      }
    }
    return i;
  }
  function cc(o, e, t, r) {
    const i = pc(e);
    let n = !1;
    let s;
    let l = !1;
    (i.addEventListener(
      "before",
      () => {
        ((l = !0),
          (s = new AbortController()),
          (n = !1),
          o.addEventListener(
            "invalid",
            () => {
              n = !0;
            },
            { signal: s.signal },
          ));
      },
      { signal: r },
    ),
      i.addEventListener(
        "after",
        () => {
          ((l = !1), s?.abort(), !n && t());
        },
        { signal: r },
      ),
      e.addEventListener(
        "submit",
        () => {
          l || t();
        },
        { signal: r },
      ));
  }
  function pc(o) {
    if (!ri.has(o)) {
      const e = new EventTarget();
      ri.set(o, e);
      for (const t of ["reportValidity", "requestSubmit"]) {
        const r = o[t];
        o[t] = function () {
          e.dispatchEvent(new Event("before"));
          const i = Reflect.apply(r, this, arguments);
          return (e.dispatchEvent(new Event("after")), i);
        };
      }
    }
    return ri.get(o);
  }
  function uc(o, e) {
    if (!o) return !0;
    let t;
    for (const r of o.elements)
      if (r.matches(":invalid")) {
        t = r;
        break;
      }
    return t === e;
  }
  let ft;
  let ko;
  let Lo;
  let Mo;
  let Do;
  let ri;
  const ii = d(() => {
    y();
    Ae();
    ((ft = Symbol("onReportValidity")),
      (ko = Symbol("privateCleanupFormListeners")),
      (Lo = Symbol("privateDoNotReportInvalid")),
      (Mo = Symbol("privateIsSelfReportingValidity")),
      (Do = Symbol("privateCallOnReportValidity")));
    ri = new WeakMap();
  });
  let vt;
  const ni = d(() => {
    vt = class {
      constructor(e) {
        ((this.getCurrentState = e),
          (this.currentValidity = { validity: {}, validationMessage: "" }));
      }

      getValidity() {
        const e = this.getCurrentState();
        if (!(!this.prevState || !this.equals(this.prevState, e)))
          return this.currentValidity;
        const { validity: r, validationMessage: i } = this.computeValidity(e);
        return (
          (this.prevState = this.copy(e)),
          (this.currentValidity = {
            validationMessage: i,
            validity: {
              badInput: r.badInput,
              customError: r.customError,
              patternMismatch: r.patternMismatch,
              rangeOverflow: r.rangeOverflow,
              rangeUnderflow: r.rangeUnderflow,
              stepMismatch: r.stepMismatch,
              tooLong: r.tooLong,
              tooShort: r.tooShort,
              typeMismatch: r.typeMismatch,
              valueMissing: r.valueMissing,
            },
          }),
          this.currentValidity
        );
      }
    };
  });
  function Bt(o) {
    return o.type !== "textarea";
  }
  let Bo;
  const Gs = d(() => {
    ni();
    Bo = class extends vt {
      computeValidity({ state: e, renderedControl: t }) {
        let r = t;
        Bt(e) && !r
          ? ((r = this.inputControl || document.createElement("input")),
            (this.inputControl = r))
          : r ||
            ((r = this.textAreaControl || document.createElement("textarea")),
            (this.textAreaControl = r));
        const i = Bt(e) ? r : null;
        if (
          (i && (i.type = e.type),
          r.value !== e.value && (r.value = e.value),
          (r.required = e.required),
          i)
        ) {
          const n = e;
          (n.pattern ? (i.pattern = n.pattern) : i.removeAttribute("pattern"),
            n.min ? (i.min = n.min) : i.removeAttribute("min"),
            n.max ? (i.max = n.max) : i.removeAttribute("max"),
            n.step ? (i.step = n.step) : i.removeAttribute("step"));
        }
        return (
          (e.minLength ?? -1) > -1
            ? r.setAttribute("minlength", String(e.minLength))
            : r.removeAttribute("minlength"),
          (e.maxLength ?? -1) > -1
            ? r.setAttribute("maxlength", String(e.maxLength))
            : r.removeAttribute("maxlength"),
          { validity: r.validity, validationMessage: r.validationMessage }
        );
      }

      equals({ state: e }, { state: t }) {
        const r =
          e.type === t.type &&
          e.value === t.value &&
          e.required === t.required &&
          e.minLength === t.minLength &&
          e.maxLength === t.maxLength;
        return !Bt(e) || !Bt(t)
          ? r
          : r &&
              e.pattern === t.pattern &&
              e.min === t.min &&
              e.max === t.max &&
              e.step === t.step;
      }

      copy({ state: e }) {
        return {
          state: Bt(e) ? this.copyInput(e) : this.copyTextArea(e),
          renderedControl: null,
        };
      }

      copyInput(e) {
        const { type: t, pattern: r, min: i, max: n, step: s } = e;
        return {
          ...this.copySharedState(e),
          type: t,
          pattern: r,
          min: i,
          max: n,
          step: s,
        };
      }

      copyTextArea(e) {
        return { ...this.copySharedState(e), type: e.type };
      }

      copySharedState({ value: e, required: t, minLength: r, maxLength: i }) {
        return { value: e, required: t, minLength: r, maxLength: i };
      }
    };
  });
  let hc;
  let A;
  const Ys = d(() => {
    T();
    y();
    I();
    ge();
    Hs();
    So();
    De();
    ke();
    js();
    $o();
    ti();
    Ae();
    oi();
    ii();
    Gs();
    ((hc = oe(zo(Oo(Po(Le(E)))))),
      (A = class extends hc {
        constructor() {
          (super(...arguments),
            (this.error = !1),
            (this.errorText = ""),
            (this.label = ""),
            (this.noAsterisk = !1),
            (this.required = !1),
            (this.value = ""),
            (this.prefixText = ""),
            (this.suffixText = ""),
            (this.hasLeadingIcon = !1),
            (this.hasTrailingIcon = !1),
            (this.supportingText = ""),
            (this.textDirection = ""),
            (this.rows = 2),
            (this.cols = 20),
            (this.inputMode = ""),
            (this.max = ""),
            (this.maxLength = -1),
            (this.min = ""),
            (this.minLength = -1),
            (this.noSpinner = !1),
            (this.pattern = ""),
            (this.placeholder = ""),
            (this.readOnly = !1),
            (this.multiple = !1),
            (this.step = ""),
            (this.type = "text"),
            (this.autocomplete = ""),
            (this.dirty = !1),
            (this.focused = !1),
            (this.nativeError = !1),
            (this.nativeErrorText = ""));
        }

        get selectionDirection() {
          return this.getInputOrTextarea().selectionDirection;
        }

        set selectionDirection(e) {
          this.getInputOrTextarea().selectionDirection = e;
        }

        get selectionEnd() {
          return this.getInputOrTextarea().selectionEnd;
        }

        set selectionEnd(e) {
          this.getInputOrTextarea().selectionEnd = e;
        }

        get selectionStart() {
          return this.getInputOrTextarea().selectionStart;
        }

        set selectionStart(e) {
          this.getInputOrTextarea().selectionStart = e;
        }

        get valueAsNumber() {
          const e = this.getInput();
          return e ? e.valueAsNumber : NaN;
        }

        set valueAsNumber(e) {
          const t = this.getInput();
          t && ((t.valueAsNumber = e), (this.value = t.value));
        }

        get valueAsDate() {
          const e = this.getInput();
          return e ? e.valueAsDate : null;
        }

        set valueAsDate(e) {
          const t = this.getInput();
          t && ((t.valueAsDate = e), (this.value = t.value));
        }

        get hasError() {
          return this.error || this.nativeError;
        }

        select() {
          this.getInputOrTextarea().select();
        }

        setRangeText(...e) {
          (this.getInputOrTextarea().setRangeText(...e),
            (this.value = this.getInputOrTextarea().value));
        }

        setSelectionRange(e, t, r) {
          this.getInputOrTextarea().setSelectionRange(e, t, r);
        }

        showPicker() {
          const e = this.getInput();
          e && e.showPicker();
        }

        stepDown(e) {
          const t = this.getInput();
          t && (t.stepDown(e), (this.value = t.value));
        }

        stepUp(e) {
          const t = this.getInput();
          t && (t.stepUp(e), (this.value = t.value));
        }

        reset() {
          ((this.dirty = !1),
            (this.value = this.getAttribute("value") ?? ""),
            (this.nativeError = !1),
            (this.nativeErrorText = ""));
        }

        attributeChangedCallback(e, t, r) {
          (e === "value" && this.dirty) ||
            super.attributeChangedCallback(e, t, r);
        }

        render() {
          const e = {
            disabled: this.disabled,
            error: !this.disabled && this.hasError,
            textarea: this.type === "textarea",
            "no-spinner": this.noSpinner,
          };
          return v`
      <span class="text-field ${K(e)}">
        ${this.renderField()}
      </span>
    `;
        }

        updated(e) {
          const t = this.getInputOrTextarea().value;
          this.value !== t && (this.value = t);
        }

        renderField() {
          return Me`<${this.fieldTag}
      class="field"
      count=${this.value.length}
      ?disabled=${this.disabled}
      ?error=${this.hasError}
      error-text=${this.getErrorText()}
      ?focused=${this.focused}
      ?has-end=${this.hasTrailingIcon}
      ?has-start=${this.hasLeadingIcon}
      label=${this.label}
      ?no-asterisk=${this.noAsterisk}
      max=${this.maxLength}
      ?populated=${!!this.value}
      ?required=${this.required}
      ?resizable=${this.type === "textarea"}
      supporting-text=${this.supportingText}
    >
      ${this.renderLeadingIcon()}
      ${this.renderInputOrTextarea()}
      ${this.renderTrailingIcon()}
      <div id="description" slot="aria-describedby"></div>
      <slot name="container" slot="container"></slot>
    </${this.fieldTag}>`;
        }

        renderLeadingIcon() {
          return v`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
        }

        renderTrailingIcon() {
          return v`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
        }

        renderInputOrTextarea() {
          const e = { direction: this.textDirection };
          const t = this.ariaLabel || this.label || u;
          const r = this.autocomplete;
          const i = (this.maxLength ?? -1) > -1;
          const n = (this.minLength ?? -1) > -1;
          if (this.type === "textarea")
            return v`
        <textarea
          class="input"
          style=${Ye(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${r || u}
          name=${this.name || u}
          ?disabled=${this.disabled}
          maxlength=${i ? this.maxLength : u}
          minlength=${n ? this.minLength : u}
          placeholder=${this.placeholder || u}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          rows=${this.rows}
          cols=${this.cols}
          .value=${Qr(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent}></textarea>
      `;
          const s = this.renderPrefix();
          const l = this.renderSuffix();
          const c = this.inputMode;
          return v`
      <div class="input-wrapper">
        ${s}
        <input
          class="input"
          style=${Ye(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${r || u}
          name=${this.name || u}
          ?disabled=${this.disabled}
          inputmode=${c || u}
          max=${this.max || u}
          maxlength=${i ? this.maxLength : u}
          min=${this.min || u}
          minlength=${n ? this.minLength : u}
          pattern=${this.pattern || u}
          placeholder=${this.placeholder || u}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          ?multiple=${this.multiple}
          step=${this.step || u}
          type=${this.type}
          .value=${Qr(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent} />
        ${l}
      </div>
    `;
        }

        renderPrefix() {
          return this.renderAffix(this.prefixText, !1);
        }

        renderSuffix() {
          return this.renderAffix(this.suffixText, !0);
        }

        renderAffix(e, t) {
          return e
            ? v`<span class="${K({ suffix: t, prefix: !t })}">${e}</span>`
            : u;
        }

        getErrorText() {
          return this.error ? this.errorText : this.nativeErrorText;
        }

        handleFocusChange() {
          this.focused = this.inputOrTextarea?.matches(":focus") ?? !1;
        }

        handleInput(e) {
          ((this.dirty = !0), (this.value = e.target.value));
        }

        redispatchEvent(e) {
          ut(this, e);
        }

        getInputOrTextarea() {
          return (
            this.inputOrTextarea ||
              (this.connectedCallback(), this.scheduleUpdate()),
            this.isUpdatePending && this.scheduleUpdate(),
            this.inputOrTextarea
          );
        }

        getInput() {
          return this.type === "textarea" ? null : this.getInputOrTextarea();
        }

        handleIconChange() {
          ((this.hasLeadingIcon = this.leadingIcons.length > 0),
            (this.hasTrailingIcon = this.trailingIcons.length > 0));
        }

        [Xe]() {
          return this.value;
        }

        formResetCallback() {
          this.reset();
        }

        formStateRestoreCallback(e) {
          this.value = e;
        }

        focus() {
          this.getInputOrTextarea().focus();
        }

        [ht]() {
          return new Bo(() => ({
            state: this,
            renderedControl: this.inputOrTextarea,
          }));
        }

        [mt]() {
          return this.inputOrTextarea;
        }

        [ft](e) {
          e?.preventDefault();
          const t = this.getErrorText();
          ((this.nativeError = !!e),
            (this.nativeErrorText = this.validationMessage),
            t === this.getErrorText() && this.field?.reannounceError());
        }
      }));
    A.shadowRootOptions = { ...E.shadowRootOptions, delegatesFocus: !0 };
    a([p({ type: Boolean, reflect: !0 })], A.prototype, "error", void 0);
    a([p({ attribute: "error-text" })], A.prototype, "errorText", void 0);
    a([p()], A.prototype, "label", void 0);
    a(
      [p({ type: Boolean, attribute: "no-asterisk" })],
      A.prototype,
      "noAsterisk",
      void 0,
    );
    a([p({ type: Boolean, reflect: !0 })], A.prototype, "required", void 0);
    a([p()], A.prototype, "value", void 0);
    a([p({ attribute: "prefix-text" })], A.prototype, "prefixText", void 0);
    a([p({ attribute: "suffix-text" })], A.prototype, "suffixText", void 0);
    a(
      [p({ type: Boolean, attribute: "has-leading-icon" })],
      A.prototype,
      "hasLeadingIcon",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "has-trailing-icon" })],
      A.prototype,
      "hasTrailingIcon",
      void 0,
    );
    a(
      [p({ attribute: "supporting-text" })],
      A.prototype,
      "supportingText",
      void 0,
    );
    a(
      [p({ attribute: "text-direction" })],
      A.prototype,
      "textDirection",
      void 0,
    );
    a([p({ type: Number })], A.prototype, "rows", void 0);
    a([p({ type: Number })], A.prototype, "cols", void 0);
    a([p({ reflect: !0 })], A.prototype, "inputMode", void 0);
    a([p()], A.prototype, "max", void 0);
    a([p({ type: Number })], A.prototype, "maxLength", void 0);
    a([p()], A.prototype, "min", void 0);
    a([p({ type: Number })], A.prototype, "minLength", void 0);
    a(
      [p({ type: Boolean, attribute: "no-spinner" })],
      A.prototype,
      "noSpinner",
      void 0,
    );
    a([p()], A.prototype, "pattern", void 0);
    a([p({ reflect: !0, converter: Ws })], A.prototype, "placeholder", void 0);
    a([p({ type: Boolean, reflect: !0 })], A.prototype, "readOnly", void 0);
    a([p({ type: Boolean, reflect: !0 })], A.prototype, "multiple", void 0);
    a([p()], A.prototype, "step", void 0);
    a([p({ reflect: !0 })], A.prototype, "type", void 0);
    a([p({ reflect: !0 })], A.prototype, "autocomplete", void 0);
    a([M()], A.prototype, "dirty", void 0);
    a([M()], A.prototype, "focused", void 0);
    a([M()], A.prototype, "nativeError", void 0);
    a([M()], A.prototype, "nativeErrorText", void 0);
    a([S(".input")], A.prototype, "inputOrTextarea", void 0);
    a([S(".field")], A.prototype, "field", void 0);
    a([Z({ slot: "leading-icon" })], A.prototype, "leadingIcons", void 0);
    a([Z({ slot: "trailing-icon" })], A.prototype, "trailingIcons", void 0);
  });
  let No;
  const Xs = d(() => {
    Io();
    De();
    Ys();
    No = class extends A {
      constructor() {
        (super(...arguments), (this.fieldTag = ne`md-outlined-field`));
      }
    };
  });
  let Zs;
  const Js = d(() => {
    y();
    Zs = x`:host{display:inline-flex;outline:none;resize:both;text-align:start;-webkit-tap-highlight-color:rgba(0,0,0,0)}.text-field,.field{width:100%}.text-field{display:inline-flex}.field{cursor:text}.disabled .field{cursor:default}.text-field,.textarea .field{resize:inherit}slot[name=container]{border-radius:inherit}.icon{color:currentColor;display:flex;align-items:center;justify-content:center;fill:currentColor;position:relative}.icon ::slotted(*){display:flex;position:absolute}[has-start] .icon.leading{font-size:var(--_leading-icon-size);height:var(--_leading-icon-size);width:var(--_leading-icon-size)}[has-end] .icon.trailing{font-size:var(--_trailing-icon-size);height:var(--_trailing-icon-size);width:var(--_trailing-icon-size)}.input-wrapper{display:flex}.input-wrapper>*{all:inherit;padding:0}.input{caret-color:var(--_caret-color);overflow-x:hidden;text-align:inherit}.input::placeholder{color:currentColor;opacity:1}.input::-webkit-calendar-picker-indicator{display:none}.input::-webkit-search-decoration,.input::-webkit-search-cancel-button{display:none}@media(forced-colors: active){.input{background:none}}.no-spinner .input::-webkit-inner-spin-button,.no-spinner .input::-webkit-outer-spin-button{display:none}.no-spinner .input[type=number]{-moz-appearance:textfield}:focus-within .input{caret-color:var(--_focus-caret-color)}.error:focus-within .input{caret-color:var(--_error-focus-caret-color)}.text-field:not(.disabled) .prefix{color:var(--_input-text-prefix-color)}.text-field:not(.disabled) .suffix{color:var(--_input-text-suffix-color)}.text-field:not(.disabled) .input::placeholder{color:var(--_input-text-placeholder-color)}.prefix,.suffix{text-wrap:nowrap;width:min-content}.prefix{padding-inline-end:var(--_input-text-prefix-trailing-space)}.suffix{padding-inline-start:var(--_input-text-suffix-leading-space)}
`;
  });
  let si;
  const Qs = d(() => {
    T();
    Io();
    I();
    De();
    zs();
    Xs();
    Js();
    si = class extends No {
      constructor() {
        (super(...arguments), (this.fieldTag = ne`md-outlined-field`));
      }
    };
    si.styles = [Zs, Ds];
    si = a([C("md-outlined-text-field")], si);
  });
  function ai(o, e = Te) {
    const t = Nt(o, e);
    return (t && ((t.tabIndex = 0), t.focus()), t);
  }
  function li(o, e = Te) {
    const t = di(o, e);
    return (t && ((t.tabIndex = 0), t.focus()), t);
  }
  function ze(o, e = Te) {
    for (let t = 0; t < o.length; t++) {
      const r = o[t];
      if (r.tabIndex === 0 && e(r)) return { item: r, index: t };
    }
    return null;
  }
  function Nt(o, e = Te) {
    for (const t of o) if (e(t)) return t;
    return null;
  }
  function di(o, e = Te) {
    for (let t = o.length - 1; t >= 0; t--) {
      const r = o[t];
      if (e(r)) return r;
    }
    return null;
  }
  function mc(o, e, t = Te, r = !0) {
    for (let i = 1; i < o.length; i++) {
      const n = (i + e) % o.length;
      if (n < e && !r) return null;
      const s = o[n];
      if (t(s)) return s;
    }
    return o[e] ? o[e] : null;
  }
  function fc(o, e, t = Te, r = !0) {
    for (let i = 1; i < o.length; i++) {
      const n = (e - i + o.length) % o.length;
      if (n > e && !r) return null;
      const s = o[n];
      if (t(s)) return s;
    }
    return o[e] ? o[e] : null;
  }
  function ci(o, e, t = Te, r = !0) {
    if (e) {
      const i = mc(o, e.index, t, r);
      return (i && ((i.tabIndex = 0), i.focus()), i);
    }
    return ai(o, t);
  }
  function pi(o, e, t = Te, r = !0) {
    if (e) {
      const i = fc(o, e.index, t, r);
      return (i && ((i.tabIndex = 0), i.focus()), i);
    }
    return li(o, t);
  }
  function ea() {
    return new Event("request-activation", { bubbles: !0, composed: !0 });
  }
  function Te(o) {
    return !o.disabled;
  }
  const Ft = d(() => {});
  let Y;
  let gt;
  const ui = d(() => {
    Ft();
    ((Y = {
      ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      ArrowUp: "ArrowUp",
      ArrowRight: "ArrowRight",
      Home: "Home",
      End: "End",
    }),
      (gt = class {
        constructor(e) {
          ((this.handleKeydown = (f) => {
            const h = f.key;
            if (f.defaultPrevented || !this.isNavigableKey(h)) return;
            const b = this.items;
            if (!b.length) return;
            const _ = ze(b, this.isActivatable);
            f.preventDefault();
            const P = this.isRtl();
            const $ = P ? Y.ArrowRight : Y.ArrowLeft;
            const D = P ? Y.ArrowLeft : Y.ArrowRight;
            let k = null;
            switch (h) {
              case Y.ArrowDown:
              case D:
                k = ci(b, _, this.isActivatable, this.wrapNavigation());
                break;
              case Y.ArrowUp:
              case $:
                k = pi(b, _, this.isActivatable, this.wrapNavigation());
                break;
              case Y.Home:
                k = ai(b, this.isActivatable);
                break;
              case Y.End:
                k = li(b, this.isActivatable);
                break;
              default:
                break;
            }
            k && _ && _.item !== k && (_.item.tabIndex = -1);
          }),
            (this.onDeactivateItems = () => {
              const f = this.items;
              for (const h of f) this.deactivateItem(h);
            }),
            (this.onRequestActivation = (f) => {
              this.onDeactivateItems();
              const h = f.target;
              (this.activateItem(h), h.focus());
            }),
            (this.onSlotchange = () => {
              const f = this.items;
              let h = !1;
              for (const _ of f) {
                if (!_.disabled && _.tabIndex > -1 && !h) {
                  ((h = !0), (_.tabIndex = 0));
                  continue;
                }
                _.tabIndex = -1;
              }
              if (h) return;
              const b = Nt(f, this.isActivatable);
              b && (b.tabIndex = 0);
            }));
          const {
            isItem: t,
            getPossibleItems: r,
            isRtl: i,
            deactivateItem: n,
            activateItem: s,
            isNavigableKey: l,
            isActivatable: c,
            wrapNavigation: m,
          } = e;
          ((this.isItem = t),
            (this.getPossibleItems = r),
            (this.isRtl = i),
            (this.deactivateItem = n),
            (this.activateItem = s),
            (this.isNavigableKey = l),
            (this.isActivatable = c),
            (this.wrapNavigation = m ?? (() => !0)));
        }

        get items() {
          const e = this.getPossibleItems();
          const t = [];
          for (const r of e) {
            if (this.isItem(r)) {
              t.push(r);
              continue;
            }
            const n = r.item;
            n && this.isItem(n) && t.push(n);
          }
          return t;
        }

        activateNextItem() {
          const e = this.items;
          const t = ze(e, this.isActivatable);
          return (
            t && (t.item.tabIndex = -1),
            ci(e, t, this.isActivatable, this.wrapNavigation())
          );
        }

        activatePreviousItem() {
          const e = this.items;
          const t = ze(e, this.isActivatable);
          return (
            t && (t.item.tabIndex = -1),
            pi(e, t, this.isActivatable, this.wrapNavigation())
          );
        }
      }));
  });
  function vc(o, e) {
    return new CustomEvent("close-menu", {
      bubbles: !0,
      composed: !0,
      detail: { initiator: o, reason: e, itemPath: [o] },
    });
  }
  function Uo(o) {
    return Object.values(gc).some((e) => e === o);
  }
  function ta(o) {
    return Object.values(hi).some((e) => e === o);
  }
  function Ut(o, e) {
    const t = new Event("md-contains", { bubbles: !0, composed: !0 });
    let r = [];
    const i = (s) => {
      r = s.composedPath();
    };
    return (
      e.addEventListener("md-contains", i),
      o.dispatchEvent(t),
      e.removeEventListener("md-contains", i),
      r.length > 0
    );
  }
  let mi;
  let hi;
  let Fo;
  let gc;
  let re;
  const Ht = d(() => {
    ((mi = vc),
      (hi = { SPACE: "Space", ENTER: "Enter" }),
      (Fo = { CLICK_SELECTION: "click-selection", KEYDOWN: "keydown" }),
      (gc = { ESCAPE: "Escape", SPACE: hi.SPACE, ENTER: hi.ENTER }));
    re = {
      NONE: "none",
      LIST_ROOT: "list-root",
      FIRST_ITEM: "first-item",
      LAST_ITEM: "last-item",
    };
  });
  let qt;
  let Ho;
  const fi = d(() => {
    ((qt = {
      END_START: "end-start",
      END_END: "end-end",
      START_START: "start-start",
      START_END: "start-end",
    }),
      (Ho = class {
        constructor(e, t) {
          ((this.host = e),
            (this.getProperties = t),
            (this.surfaceStylesInternal = { display: "none" }),
            (this.lastValues = { isOpen: !1 }),
            this.host.addController(this));
        }

        get surfaceStyles() {
          return this.surfaceStylesInternal;
        }

        async position() {
          const {
            surfaceEl: e,
            anchorEl: t,
            anchorCorner: r,
            surfaceCorner: i,
            positioning: n,
            xOffset: s,
            yOffset: l,
            disableBlockFlip: c,
            disableInlineFlip: m,
            repositionStrategy: f,
          } = this.getProperties();
          const h = r.toLowerCase().trim();
          const b = i.toLowerCase().trim();
          if (!e || !t) return;
          const _ = window.innerWidth;
          const P = window.innerHeight;
          const $ = document.createElement("div");
          (($.style.opacity = "0"),
            ($.style.position = "fixed"),
            ($.style.display = "block"),
            ($.style.inset = "0"),
            document.body.appendChild($));
          const D = $.getBoundingClientRect();
          $.remove();
          const k = window.innerHeight - D.bottom;
          const w = window.innerWidth - D.right;
          ((this.surfaceStylesInternal = { display: "block", opacity: "0" }),
            this.host.requestUpdate(),
            await this.host.updateComplete,
            e.popover && e.isConnected && e.showPopover());
          const L = e.getSurfacePositionClientRect
            ? e.getSurfacePositionClientRect()
            : e.getBoundingClientRect();
          const H = t.getSurfacePositionClientRect
            ? t.getSurfacePositionClientRect()
            : t.getBoundingClientRect();
          const [z, X] = b.split("-");
          const [ce, fe] = h.split("-");
          const qe = getComputedStyle(e).direction === "ltr";
          let {
            blockInset: be,
            blockOutOfBoundsCorrection: ie,
            surfaceBlockProperty: Ct,
          } = this.calculateBlock({
            surfaceRect: L,
            anchorRect: H,
            anchorBlock: ce,
            surfaceBlock: z,
            yOffset: l,
            positioning: n,
            windowInnerHeight: P,
            blockScrollbarHeight: k,
          });
          if (ie && !c) {
            const wr = z === "start" ? "end" : "start";
            const Er = ce === "start" ? "end" : "start";
            const xe = this.calculateBlock({
              surfaceRect: L,
              anchorRect: H,
              anchorBlock: Er,
              surfaceBlock: wr,
              yOffset: l,
              positioning: n,
              windowInnerHeight: P,
              blockScrollbarHeight: k,
            });
            ie > xe.blockOutOfBoundsCorrection &&
              ((be = xe.blockInset),
              (ie = xe.blockOutOfBoundsCorrection),
              (Ct = xe.surfaceBlockProperty));
          }
          let {
            inlineInset: io,
            inlineOutOfBoundsCorrection: rt,
            surfaceInlineProperty: on,
          } = this.calculateInline({
            surfaceRect: L,
            anchorRect: H,
            anchorInline: fe,
            surfaceInline: X,
            xOffset: s,
            positioning: n,
            isLTR: qe,
            windowInnerWidth: _,
            inlineScrollbarWidth: w,
          });
          if (rt && !m) {
            const wr = X === "start" ? "end" : "start";
            const Er = fe === "start" ? "end" : "start";
            const xe = this.calculateInline({
              surfaceRect: L,
              anchorRect: H,
              anchorInline: Er,
              surfaceInline: wr,
              xOffset: s,
              positioning: n,
              isLTR: qe,
              windowInnerWidth: _,
              inlineScrollbarWidth: w,
            });
            Math.abs(rt) > Math.abs(xe.inlineOutOfBoundsCorrection) &&
              ((io = xe.inlineInset),
              (rt = xe.inlineOutOfBoundsCorrection),
              (on = xe.surfaceInlineProperty));
          }
          (f === "move" && ((be -= ie), (io -= rt)),
            (this.surfaceStylesInternal = {
              display: "block",
              opacity: "1",
              [Ct]: `${be}px`,
              [on]: `${io}px`,
            }),
            f === "resize" &&
              (ie && (this.surfaceStylesInternal.height = `${L.height - ie}px`),
              rt && (this.surfaceStylesInternal.width = `${L.width - rt}px`)),
            this.host.requestUpdate());
        }

        calculateBlock(e) {
          const {
            surfaceRect: t,
            anchorRect: r,
            anchorBlock: i,
            surfaceBlock: n,
            yOffset: s,
            positioning: l,
            windowInnerHeight: c,
            blockScrollbarHeight: m,
          } = e;
          const f = l === "fixed" || l === "document" ? 1 : 0;
          const h = l === "document" ? 1 : 0;
          const b = n === "start" ? 1 : 0;
          const _ = n === "end" ? 1 : 0;
          const $ = (i !== n ? 1 : 0) * r.height + s;
          const D = b * r.top + _ * (c - r.bottom - m);
          const k = b * window.scrollY - _ * window.scrollY;
          const w = Math.abs(Math.min(0, c - D - $ - t.height));
          return {
            blockInset: f * D + h * k + $,
            blockOutOfBoundsCorrection: w,
            surfaceBlockProperty:
              n === "start" ? "inset-block-start" : "inset-block-end",
          };
        }

        calculateInline(e) {
          const {
            isLTR: t,
            surfaceInline: r,
            anchorInline: i,
            anchorRect: n,
            surfaceRect: s,
            xOffset: l,
            positioning: c,
            windowInnerWidth: m,
            inlineScrollbarWidth: f,
          } = e;
          const h = c === "fixed" || c === "document" ? 1 : 0;
          const b = c === "document" ? 1 : 0;
          const _ = t ? 1 : 0;
          const P = t ? 0 : 1;
          const $ = r === "start" ? 1 : 0;
          const D = r === "end" ? 1 : 0;
          const w = (i !== r ? 1 : 0) * n.width + l;
          const L = $ * n.left + D * (m - n.right - f);
          const H = $ * (m - n.right - f) + D * n.left;
          const z = _ * L + P * H;
          const X = $ * window.scrollX - D * window.scrollX;
          const ce = D * window.scrollX - $ * window.scrollX;
          const fe = _ * X + P * ce;
          const qe = Math.abs(Math.min(0, m - z - w - s.width));
          const be = h * z + w + b * fe;
          let ie = r === "start" ? "inset-inline-start" : "inset-inline-end";
          return (
            (c === "document" || c === "fixed") &&
              ((r === "start" && t) || (r === "end" && !t)
                ? (ie = "left")
                : (ie = "right")),
            {
              inlineInset: be,
              inlineOutOfBoundsCorrection: qe,
              surfaceInlineProperty: ie,
            }
          );
        }

        hostUpdate() {
          this.onUpdate();
        }

        hostUpdated() {
          this.onUpdate();
        }

        async onUpdate() {
          const e = this.getProperties();
          let t = !1;
          for (const [s, l] of Object.entries(e))
            if (((t = t || l !== this.lastValues[s]), t)) break;
          const r = this.lastValues.isOpen !== e.isOpen;
          const i = !!e.anchorEl;
          const n = !!e.surfaceEl;
          t &&
            i &&
            n &&
            ((this.lastValues.isOpen = e.isOpen),
            e.isOpen
              ? ((this.lastValues = e), await this.position(), e.onOpen())
              : r && (await e.beforeClose(), this.close(), e.onClose()));
        }

        close() {
          ((this.surfaceStylesInternal = { display: "none" }),
            this.host.requestUpdate());
          const e = this.getProperties().surfaceEl;
          e?.popover && e?.isConnected && e.hidePopover();
        }
      }));
  });
  let se;
  let qo;
  const vi = d(() => {
    ((se = { INDEX: 0, ITEM: 1, TEXT: 2 }),
      (qo = class {
        constructor(e) {
          ((this.getProperties = e),
            (this.typeaheadRecords = []),
            (this.typaheadBuffer = ""),
            (this.cancelTypeaheadTimeout = 0),
            (this.isTypingAhead = !1),
            (this.lastActiveRecord = null),
            (this.onKeydown = (t) => {
              this.isTypingAhead ? this.typeahead(t) : this.beginTypeahead(t);
            }),
            (this.endTypeahead = () => {
              ((this.isTypingAhead = !1),
                (this.typaheadBuffer = ""),
                (this.typeaheadRecords = []));
            }));
        }

        get items() {
          return this.getProperties().getItems();
        }

        get active() {
          return this.getProperties().active;
        }

        beginTypeahead(e) {
          this.active &&
            (e.code === "Space" ||
              e.code === "Enter" ||
              e.code.startsWith("Arrow") ||
              e.code === "Escape" ||
              ((this.isTypingAhead = !0),
              (this.typeaheadRecords = this.items.map((t, r) => [
                r,
                t,
                t.typeaheadText.trim().toLowerCase(),
              ])),
              (this.lastActiveRecord =
                this.typeaheadRecords.find((t) => t[se.ITEM].tabIndex === 0) ??
                null),
              this.lastActiveRecord &&
                (this.lastActiveRecord[se.ITEM].tabIndex = -1),
              this.typeahead(e)));
        }

        typeahead(e) {
          if (e.defaultPrevented) return;
          if (
            (clearTimeout(this.cancelTypeaheadTimeout),
            e.code === "Enter" ||
              e.code.startsWith("Arrow") ||
              e.code === "Escape")
          ) {
            (this.endTypeahead(),
              this.lastActiveRecord &&
                (this.lastActiveRecord[se.ITEM].tabIndex = -1));
            return;
          }
          (e.code === "Space" && e.preventDefault(),
            (this.cancelTypeaheadTimeout = setTimeout(
              this.endTypeahead,
              this.getProperties().typeaheadBufferTime,
            )),
            (this.typaheadBuffer += e.key.toLowerCase()));
          const t = this.lastActiveRecord
            ? this.lastActiveRecord[se.INDEX]
            : -1;
          const r = this.typeaheadRecords.length;
          const i = (c) => (c[se.INDEX] + r - t) % r;
          const n = this.typeaheadRecords
            .filter(
              (c) =>
                !c[se.ITEM].disabled &&
                c[se.TEXT].startsWith(this.typaheadBuffer),
            )
            .sort((c, m) => i(c) - i(m));
          if (n.length === 0) {
            (clearTimeout(this.cancelTypeaheadTimeout),
              this.lastActiveRecord &&
                (this.lastActiveRecord[se.ITEM].tabIndex = -1),
              this.endTypeahead());
            return;
          }
          const s = this.typaheadBuffer.length === 1;
          let l;
          (this.lastActiveRecord === n[0] && s
            ? (l = n[1] ?? n[0])
            : (l = n[0]),
            this.lastActiveRecord &&
              (this.lastActiveRecord[se.ITEM].tabIndex = -1),
            (this.lastActiveRecord = l),
            (l[se.ITEM].tabIndex = 0),
            l[se.ITEM].focus());
        }
      }));
  });
  function bc(o = document) {
    let e = o.activeElement;
    for (; e && e?.shadowRoot?.activeElement; ) e = e.shadowRoot.activeElement;
    return e;
  }
  let gi;
  let oa;
  let yc;
  let F;
  const Vo = d(() => {
    T();
    Lr();
    dt();
    y();
    I();
    ge();
    So();
    Dt();
    ui();
    Ft();
    Ht();
    fi();
    vi();
    fi();
    ((gi = 200),
      (oa = new Set([Y.ArrowDown, Y.ArrowUp, Y.Home, Y.End])),
      (yc = new Set([Y.ArrowLeft, Y.ArrowRight, ...oa])));
    F = class extends E {
      get openDirection() {
        return this.menuCorner.split("-")[0] === "start" ? "DOWN" : "UP";
      }

      get anchorElement() {
        return this.anchor
          ? this.getRootNode().querySelector(`#${this.anchor}`)
          : this.currentAnchorElement;
      }

      set anchorElement(e) {
        ((this.currentAnchorElement = e), this.requestUpdate("anchorElement"));
      }

      constructor() {
        (super(),
          (this.anchor = ""),
          (this.positioning = "absolute"),
          (this.quick = !1),
          (this.hasOverflow = !1),
          (this.open = !1),
          (this.xOffset = 0),
          (this.yOffset = 0),
          (this.noHorizontalFlip = !1),
          (this.noVerticalFlip = !1),
          (this.typeaheadDelay = gi),
          (this.anchorCorner = qt.END_START),
          (this.menuCorner = qt.START_START),
          (this.stayOpenOnOutsideClick = !1),
          (this.stayOpenOnFocusout = !1),
          (this.skipRestoreFocus = !1),
          (this.defaultFocus = re.FIRST_ITEM),
          (this.noNavigationWrap = !1),
          (this.typeaheadActive = !0),
          (this.isSubmenu = !1),
          (this.pointerPath = []),
          (this.isRepositioning = !1),
          (this.openCloseAnimationSignal = Kn()),
          (this.listController = new gt({
            isItem: (e) => e.hasAttribute("md-menu-item"),
            getPossibleItems: () => this.slotItems,
            isRtl: () => getComputedStyle(this).direction === "rtl",
            deactivateItem: (e) => {
              ((e.selected = !1), (e.tabIndex = -1));
            },
            activateItem: (e) => {
              ((e.selected = !0), (e.tabIndex = 0));
            },
            isNavigableKey: (e) => {
              if (!this.isSubmenu) return yc.has(e);
              const r =
                getComputedStyle(this).direction === "rtl"
                  ? Y.ArrowLeft
                  : Y.ArrowRight;
              return e === r ? !0 : oa.has(e);
            },
            wrapNavigation: () => !this.noNavigationWrap,
          })),
          (this.lastFocusedElement = null),
          (this.typeaheadController = new qo(() => ({
            getItems: () => this.items,
            typeaheadBufferTime: this.typeaheadDelay,
            active: this.typeaheadActive,
          }))),
          (this.currentAnchorElement = null),
          (this.internals = this.attachInternals()),
          (this.menuPositionController = new Ho(this, () => ({
            anchorCorner: this.anchorCorner,
            surfaceCorner: this.menuCorner,
            surfaceEl: this.surfaceEl,
            anchorEl: this.anchorElement,
            positioning:
              this.positioning === "popover" ? "document" : this.positioning,
            isOpen: this.open,
            xOffset: this.xOffset,
            yOffset: this.yOffset,
            disableBlockFlip: this.noVerticalFlip,
            disableInlineFlip: this.noHorizontalFlip,
            onOpen: this.onOpened,
            beforeClose: this.beforeClose,
            onClose: this.onClosed,
            repositionStrategy:
              this.hasOverflow && this.positioning !== "popover"
                ? "move"
                : "resize",
          }))),
          (this.onWindowResize = () => {
            this.isRepositioning ||
              (this.positioning !== "document" &&
                this.positioning !== "fixed" &&
                this.positioning !== "popover") ||
              ((this.isRepositioning = !0),
              this.reposition(),
              (this.isRepositioning = !1));
          }),
          (this.handleFocusout = async (e) => {
            const t = this.anchorElement;
            if (
              this.stayOpenOnFocusout ||
              !this.open ||
              this.pointerPath.includes(t)
            )
              return;
            if (e.relatedTarget) {
              if (
                Ut(e.relatedTarget, this) ||
                (this.pointerPath.length !== 0 && Ut(e.relatedTarget, t))
              )
                return;
            } else if (this.pointerPath.includes(this)) return;
            const r = this.skipRestoreFocus;
            ((this.skipRestoreFocus = !0),
              this.close(),
              await this.updateComplete,
              (this.skipRestoreFocus = r));
          }),
          (this.onOpened = async () => {
            this.lastFocusedElement = bc();
            const e = this.items;
            const t = ze(e);
            t && this.defaultFocus !== re.NONE && (t.item.tabIndex = -1);
            let r = !this.quick;
            switch (
              (this.quick
                ? this.dispatchEvent(new Event("opening"))
                : (r = !!(await this.animateOpen())),
              this.defaultFocus)
            ) {
              case re.FIRST_ITEM:
                const i = Nt(e);
                i && ((i.tabIndex = 0), i.focus(), await i.updateComplete);
                break;
              case re.LAST_ITEM:
                const n = di(e);
                n && ((n.tabIndex = 0), n.focus(), await n.updateComplete);
                break;
              case re.LIST_ROOT:
                this.focus();
                break;
              default:
              case re.NONE:
                break;
            }
            r || this.dispatchEvent(new Event("opened"));
          }),
          (this.beforeClose = async () => {
            ((this.open = !1),
              this.skipRestoreFocus || this.lastFocusedElement?.focus?.(),
              this.quick || (await this.animateClose()));
          }),
          (this.onClosed = () => {
            this.quick &&
              (this.dispatchEvent(new Event("closing")),
              this.dispatchEvent(new Event("closed")));
          }),
          (this.onWindowPointerdown = (e) => {
            this.pointerPath = e.composedPath();
          }),
          (this.onDocumentClick = (e) => {
            if (!this.open) return;
            const t = e.composedPath();
            !this.stayOpenOnOutsideClick &&
              !t.includes(this) &&
              !t.includes(this.anchorElement) &&
              (this.open = !1);
          }),
          (this.internals.role = "menu"),
          this.addEventListener("keydown", this.handleKeydown),
          this.addEventListener("keydown", this.captureKeydown, {
            capture: !0,
          }),
          this.addEventListener("focusout", this.handleFocusout));
      }

      get items() {
        return this.listController.items;
      }

      willUpdate(e) {
        if (e.has("open")) {
          if (this.open) {
            this.removeAttribute("aria-hidden");
            return;
          }
          this.setAttribute("aria-hidden", "true");
        }
      }

      update(e) {
        (e.has("open") &&
          (this.open
            ? this.setUpGlobalEventListeners()
            : this.cleanUpGlobalEventListeners()),
          e.has("positioning") &&
            this.positioning === "popover" &&
            !this.showPopover &&
            (this.positioning = "fixed"),
          super.update(e));
      }

      connectedCallback() {
        (super.connectedCallback(),
          this.open && this.setUpGlobalEventListeners());
      }

      disconnectedCallback() {
        (super.disconnectedCallback(), this.cleanUpGlobalEventListeners());
      }

      getBoundingClientRect() {
        return this.surfaceEl
          ? this.surfaceEl.getBoundingClientRect()
          : super.getBoundingClientRect();
      }

      getClientRects() {
        return this.surfaceEl
          ? this.surfaceEl.getClientRects()
          : super.getClientRects();
      }

      render() {
        return this.renderSurface();
      }

      renderSurface() {
        return v`
      <div
        class="menu ${K(this.getSurfaceClasses())}"
        style=${Ye(this.menuPositionController.surfaceStyles)}
        popover=${this.positioning === "popover" ? "manual" : u}>
        ${this.renderElevation()}
        <div class="items">
          <div class="item-padding"> ${this.renderMenuItems()} </div>
        </div>
      </div>
    `;
      }

      renderMenuItems() {
        return v`<slot
      @close-menu=${this.onCloseMenu}
      @deactivate-items=${this.onDeactivateItems}
      @request-activation=${this.onRequestActivation}
      @deactivate-typeahead=${this.handleDeactivateTypeahead}
      @activate-typeahead=${this.handleActivateTypeahead}
      @stay-open-on-focusout=${this.handleStayOpenOnFocusout}
      @close-on-focusout=${this.handleCloseOnFocusout}
      @slotchange=${this.listController.onSlotchange}></slot>`;
      }

      renderElevation() {
        return v`<md-elevation part="elevation"></md-elevation>`;
      }

      getSurfaceClasses() {
        return {
          open: this.open,
          fixed: this.positioning === "fixed",
          "has-overflow": this.hasOverflow,
        };
      }

      captureKeydown(e) {
        (e.target === this &&
          !e.defaultPrevented &&
          Uo(e.code) &&
          (e.preventDefault(), this.close()),
          this.typeaheadController.onKeydown(e));
      }

      async animateOpen() {
        const e = this.surfaceEl;
        const t = this.slotEl;
        if (!e || !t) return !0;
        const r = this.openDirection;
        (this.dispatchEvent(new Event("opening")),
          e.classList.toggle("animating", !0));
        const i = this.openCloseAnimationSignal.start();
        const n = e.offsetHeight;
        const s = r === "UP";
        const l = this.items;
        const c = 500;
        const m = 50;
        const f = 250;
        const h = (c - f) / l.length;
        const b = e.animate([{ height: "0px" }, { height: `${n}px` }], {
          duration: c,
          easing: te.EMPHASIZED,
        });
        const _ = t.animate(
          [{ transform: s ? `translateY(-${n}px)` : "" }, { transform: "" }],
          { duration: c, easing: te.EMPHASIZED },
        );
        const P = e.animate([{ opacity: 0 }, { opacity: 1 }], m);
        const $ = [];
        for (let w = 0; w < l.length; w++) {
          const L = s ? l.length - 1 - w : w;
          const H = l[L];
          const z = H.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: f,
            delay: h * w,
          });
          (H.classList.toggle("md-menu-hidden", !0),
            z.addEventListener("finish", () => {
              H.classList.toggle("md-menu-hidden", !1);
            }),
            $.push([H, z]));
        }
        let D = (w) => {};
        const k = new Promise((w) => {
          D = w;
        });
        return (
          i.addEventListener("abort", () => {
            (b.cancel(),
              _.cancel(),
              P.cancel(),
              $.forEach(([w, L]) => {
                (w.classList.toggle("md-menu-hidden", !1), L.cancel());
              }),
              D(!0));
          }),
          b.addEventListener("finish", () => {
            (e.classList.toggle("animating", !1),
              this.openCloseAnimationSignal.finish(),
              D(!1));
          }),
          await k
        );
      }

      animateClose() {
        let e;
        const t = new Promise((z) => {
          e = z;
        });
        const r = this.surfaceEl;
        const i = this.slotEl;
        if (!r || !i) return (e(!1), t);
        const s = this.openDirection === "UP";
        (this.dispatchEvent(new Event("closing")),
          r.classList.toggle("animating", !0));
        const l = this.openCloseAnimationSignal.start();
        const c = r.offsetHeight;
        const m = this.items;
        const f = 150;
        const h = 50;
        const b = f - h;
        const _ = 50;
        const P = 50;
        const $ = 0.35;
        const D = (f - P - _) / m.length;
        const k = r.animate([{ height: `${c}px` }, { height: `${c * $}px` }], {
          duration: f,
          easing: te.EMPHASIZED_ACCELERATE,
        });
        const w = i.animate(
          [
            { transform: "" },
            { transform: s ? `translateY(-${c * (1 - $)}px)` : "" },
          ],
          { duration: f, easing: te.EMPHASIZED_ACCELERATE },
        );
        const L = r.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: h,
          delay: b,
        });
        const H = [];
        for (let z = 0; z < m.length; z++) {
          const X = s ? z : m.length - 1 - z;
          const ce = m[X];
          const fe = ce.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: _,
            delay: P + D * z,
          });
          (fe.addEventListener("finish", () => {
            ce.classList.toggle("md-menu-hidden", !0);
          }),
            H.push([ce, fe]));
        }
        return (
          l.addEventListener("abort", () => {
            (k.cancel(),
              w.cancel(),
              L.cancel(),
              H.forEach(([z, X]) => {
                (X.cancel(), z.classList.toggle("md-menu-hidden", !1));
              }),
              e(!1));
          }),
          k.addEventListener("finish", () => {
            (r.classList.toggle("animating", !1),
              H.forEach(([z]) => {
                z.classList.toggle("md-menu-hidden", !1);
              }),
              this.openCloseAnimationSignal.finish(),
              this.dispatchEvent(new Event("closed")),
              e(!0));
          }),
          t
        );
      }

      handleKeydown(e) {
        ((this.pointerPath = []), this.listController.handleKeydown(e));
      }

      setUpGlobalEventListeners() {
        (document.addEventListener("click", this.onDocumentClick, {
          capture: !0,
        }),
          window.addEventListener("pointerdown", this.onWindowPointerdown),
          document.addEventListener("resize", this.onWindowResize, {
            passive: !0,
          }),
          window.addEventListener("resize", this.onWindowResize, {
            passive: !0,
          }));
      }

      cleanUpGlobalEventListeners() {
        (document.removeEventListener("click", this.onDocumentClick, {
          capture: !0,
        }),
          window.removeEventListener("pointerdown", this.onWindowPointerdown),
          document.removeEventListener("resize", this.onWindowResize),
          window.removeEventListener("resize", this.onWindowResize));
      }

      onCloseMenu() {
        this.close();
      }

      onDeactivateItems(e) {
        (e.stopPropagation(), this.listController.onDeactivateItems());
      }

      onRequestActivation(e) {
        (e.stopPropagation(), this.listController.onRequestActivation(e));
      }

      handleDeactivateTypeahead(e) {
        (e.stopPropagation(), (this.typeaheadActive = !1));
      }

      handleActivateTypeahead(e) {
        (e.stopPropagation(), (this.typeaheadActive = !0));
      }

      handleStayOpenOnFocusout(e) {
        (e.stopPropagation(), (this.stayOpenOnFocusout = !0));
      }

      handleCloseOnFocusout(e) {
        (e.stopPropagation(), (this.stayOpenOnFocusout = !1));
      }

      close() {
        ((this.open = !1),
          this.slotItems.forEach((t) => {
            t.close?.();
          }));
      }

      show() {
        this.open = !0;
      }

      activateNextItem() {
        return this.listController.activateNextItem() ?? null;
      }

      activatePreviousItem() {
        return this.listController.activatePreviousItem() ?? null;
      }

      reposition() {
        this.open && this.menuPositionController.position();
      }
    };
    a([S(".menu")], F.prototype, "surfaceEl", void 0);
    a([S("slot")], F.prototype, "slotEl", void 0);
    a([p()], F.prototype, "anchor", void 0);
    a([p()], F.prototype, "positioning", void 0);
    a([p({ type: Boolean })], F.prototype, "quick", void 0);
    a(
      [p({ type: Boolean, attribute: "has-overflow" })],
      F.prototype,
      "hasOverflow",
      void 0,
    );
    a([p({ type: Boolean, reflect: !0 })], F.prototype, "open", void 0);
    a(
      [p({ type: Number, attribute: "x-offset" })],
      F.prototype,
      "xOffset",
      void 0,
    );
    a(
      [p({ type: Number, attribute: "y-offset" })],
      F.prototype,
      "yOffset",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "no-horizontal-flip" })],
      F.prototype,
      "noHorizontalFlip",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "no-vertical-flip" })],
      F.prototype,
      "noVerticalFlip",
      void 0,
    );
    a(
      [p({ type: Number, attribute: "typeahead-delay" })],
      F.prototype,
      "typeaheadDelay",
      void 0,
    );
    a([p({ attribute: "anchor-corner" })], F.prototype, "anchorCorner", void 0);
    a([p({ attribute: "menu-corner" })], F.prototype, "menuCorner", void 0);
    a(
      [p({ type: Boolean, attribute: "stay-open-on-outside-click" })],
      F.prototype,
      "stayOpenOnOutsideClick",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "stay-open-on-focusout" })],
      F.prototype,
      "stayOpenOnFocusout",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "skip-restore-focus" })],
      F.prototype,
      "skipRestoreFocus",
      void 0,
    );
    a([p({ attribute: "default-focus" })], F.prototype, "defaultFocus", void 0);
    a(
      [p({ type: Boolean, attribute: "no-navigation-wrap" })],
      F.prototype,
      "noNavigationWrap",
      void 0,
    );
    a([Z({ flatten: !0 })], F.prototype, "slotItems", void 0);
    a([M()], F.prototype, "typeaheadActive", void 0);
  });
  let ra;
  const ia = d(() => {
    y();
    ra = x`:host{--md-elevation-level: var(--md-menu-container-elevation, 2);--md-elevation-shadow-color: var(--md-menu-container-shadow-color, var(--md-sys-color-shadow, #000));min-width:112px;color:unset;display:contents}md-focus-ring{--md-focus-ring-shape: var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px))}.menu{border-radius:var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px));display:none;inset:auto;border:none;padding:0px;overflow:visible;background-color:rgba(0,0,0,0);color:inherit;opacity:0;z-index:20;position:absolute;user-select:none;max-height:inherit;height:inherit;min-width:inherit;max-width:inherit;scrollbar-width:inherit}.menu::backdrop{display:none}.fixed{position:fixed}.items{display:block;list-style-type:none;margin:0;outline:none;box-sizing:border-box;background-color:var(--md-menu-container-color, var(--md-sys-color-surface-container, #f3edf7));height:inherit;max-height:inherit;overflow:auto;min-width:inherit;max-width:inherit;border-radius:inherit;scrollbar-width:inherit}.item-padding{padding-block:var(--md-menu-top-space, 8px) var(--md-menu-bottom-space, 8px)}.has-overflow:not([popover]) .items{overflow:visible}.has-overflow.animating .items,.animating .items{overflow:hidden}.has-overflow.animating .items{pointer-events:none}.animating ::slotted(.md-menu-hidden){opacity:0}slot{display:block;height:inherit;max-height:inherit}::slotted(:is(md-divider,[role=separator])){margin:8px 0}@media(forced-colors: active){.menu{border-style:solid;border-color:CanvasText;border-width:1px}}
`;
  });
  let yi;
  const na = d(() => {
    T();
    I();
    Vo();
    ia();
    Ht();
    Vo();
    yi = class extends F {};
    yi.styles = [ra];
    yi = a([C("md-menu")], yi);
  });
  let Wo;
  const sa = d(() => {
    y();
    ni();
    Wo = class extends vt {
      computeValidity(e) {
        return (
          this.selectControl ||
            (this.selectControl = document.createElement("select")),
          st(v`<option value=${e.value}></option>`, this.selectControl),
          (this.selectControl.value = e.value),
          (this.selectControl.required = e.required),
          {
            validity: this.selectControl.validity,
            validationMessage: this.selectControl.validationMessage,
          }
        );
      }

      equals(e, t) {
        return e.value === t.value && e.required === t.required;
      }

      copy({ value: e, required: t }) {
        return { value: e, required: t };
      }
    };
  });
  function aa(o) {
    const e = [];
    for (let t = 0; t < o.length; t++) {
      const r = o[t];
      r.selected && e.push([r, t]);
    }
    return e;
  }
  const la = d(() => {});
  let da;
  let jo;
  let xc;
  let O;
  const ca = d(() => {
    T();
    na();
    y();
    I();
    ge();
    So();
    De();
    ke();
    $o();
    ti();
    Ae();
    oi();
    ii();
    sa();
    Ft();
    Ht();
    vi();
    Vo();
    la();
    ((jo = Symbol("value")),
      (xc = oe(zo(Oo(Po(Le(E)))))),
      (O = class extends xc {
        get value() {
          return this[jo];
        }

        set value(e) {
          ((this.lastUserSetValue = e), this.select(e));
        }

        get options() {
          return this.menu?.items ?? [];
        }

        get selectedIndex() {
          const [e, t] = (this.getSelectedOptions() ?? [])[0] ?? [];
          return t ?? -1;
        }

        set selectedIndex(e) {
          ((this.lastUserSetSelectedIndex = e), this.selectIndex(e));
        }

        get selectedOptions() {
          return (this.getSelectedOptions() ?? []).map(([e]) => e);
        }

        get hasError() {
          return this.error || this.nativeError;
        }

        constructor() {
          (super(),
            (this.quick = !1),
            (this.required = !1),
            (this.errorText = ""),
            (this.label = ""),
            (this.noAsterisk = !1),
            (this.supportingText = ""),
            (this.error = !1),
            (this.menuPositioning = "popover"),
            (this.clampMenuWidth = !1),
            (this.typeaheadDelay = gi),
            (this.hasLeadingIcon = !1),
            (this.displayText = ""),
            (this.menuAlign = "start"),
            (this[da] = ""),
            (this.lastUserSetValue = null),
            (this.lastUserSetSelectedIndex = null),
            (this.lastSelectedOption = null),
            (this.lastSelectedOptionRecords = []),
            (this.nativeError = !1),
            (this.nativeErrorText = ""),
            (this.focused = !1),
            (this.open = !1),
            (this.defaultFocus = re.NONE),
            (this.prevOpen = this.open),
            (this.selectWidth = 0),
            !!1 &&
              (this.addEventListener("focus", this.handleFocus.bind(this)),
              this.addEventListener("blur", this.handleBlur.bind(this))));
        }

        select(e) {
          const t = this.options.find((r) => r.value === e);
          t && this.selectItem(t);
        }

        selectIndex(e) {
          const t = this.options[e];
          t && this.selectItem(t);
        }

        reset() {
          for (const e of this.options) e.selected = e.hasAttribute("selected");
          (this.updateValueAndDisplayText(),
            (this.nativeError = !1),
            (this.nativeErrorText = ""));
        }

        showPicker() {
          this.open = !0;
        }

        [((da = jo), ft)](e) {
          e?.preventDefault();
          const t = this.getErrorText();
          ((this.nativeError = !!e),
            (this.nativeErrorText = this.validationMessage),
            t === this.getErrorText() && this.field?.reannounceError());
        }

        update(e) {
          if (
            (this.hasUpdated || this.initUserSelection(),
            this.prevOpen !== this.open && this.open)
          ) {
            const t = this.getBoundingClientRect();
            this.selectWidth = t.width;
          }
          ((this.prevOpen = this.open), super.update(e));
        }

        render() {
          return v`
      <span
        class="select ${K(this.getRenderClasses())}"
        @focusout=${this.handleFocusout}>
        ${this.renderField()} ${this.renderMenu()}
      </span>
    `;
        }

        async firstUpdated(e) {
          (await this.menu?.updateComplete,
            this.lastSelectedOptionRecords.length || this.initUserSelection(),
            !this.lastSelectedOptionRecords.length &&
              !!1 &&
              !this.options.length &&
              setTimeout(() => {
                this.updateValueAndDisplayText();
              }),
            super.firstUpdated(e));
        }

        getRenderClasses() {
          return {
            disabled: this.disabled,
            error: this.error,
            open: this.open,
          };
        }

        renderField() {
          const e = this.ariaLabel || this.label;
          return Me`
      <${this.fieldTag}
          aria-haspopup="listbox"
          role="combobox"
          part="field"
          id="field"
          tabindex=${this.disabled ? "-1" : "0"}
          aria-label=${e || u}
          aria-describedby="description"
          aria-expanded=${this.open ? "true" : "false"}
          aria-controls="listbox"
          class="field"
          label=${this.label}
          ?no-asterisk=${this.noAsterisk}
          .focused=${this.focused || this.open}
          .populated=${!!this.displayText}
          .disabled=${this.disabled}
          .required=${this.required}
          .error=${this.hasError}
          ?has-start=${this.hasLeadingIcon}
          has-end
          supporting-text=${this.supportingText}
          error-text=${this.getErrorText()}
          @keydown=${this.handleKeydown}
          @click=${this.handleClick}>
         ${this.renderFieldContent()}
         <div id="description" slot="aria-describedby"></div>
      </${this.fieldTag}>`;
        }

        renderFieldContent() {
          return [
            this.renderLeadingIcon(),
            this.renderLabel(),
            this.renderTrailingIcon(),
          ];
        }

        renderLeadingIcon() {
          return v`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `;
        }

        renderTrailingIcon() {
          return v`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}>
          <svg height="5" viewBox="7 10 10 5" focusable="false">
            <polygon
              class="down"
              stroke="none"
              fill-rule="evenodd"
              points="7 10 12 15 17 10"></polygon>
            <polygon
              class="up"
              stroke="none"
              fill-rule="evenodd"
              points="7 15 12 10 17 15"></polygon>
          </svg>
        </slot>
      </span>
    `;
        }

        renderLabel() {
          return v`<div id="label">${this.displayText || v`&nbsp;`}</div>`;
        }

        renderMenu() {
          const e = this.label || this.ariaLabel;
          return v`<div class="menu-wrapper">
      <md-menu
        id="listbox"
        .defaultFocus=${this.defaultFocus}
        role="listbox"
        tabindex="-1"
        aria-label=${e || u}
        stay-open-on-focusout
        part="menu"
        exportparts="focus-ring: menu-focus-ring"
        anchor="field"
        style=${Ye({ "--__menu-min-width": `${this.selectWidth}px`, "--__menu-max-width": this.clampMenuWidth ? `${this.selectWidth}px` : void 0 })}
        no-navigation-wrap
        .open=${this.open}
        .quick=${this.quick}
        .positioning=${this.menuPositioning}
        .typeaheadDelay=${this.typeaheadDelay}
        .anchorCorner=${this.menuAlign === "start" ? "end-start" : "end-end"}
        .menuCorner=${this.menuAlign === "start" ? "start-start" : "start-end"}
        @opening=${this.handleOpening}
        @opened=${this.redispatchEvent}
        @closing=${this.redispatchEvent}
        @closed=${this.handleClosed}
        @close-menu=${this.handleCloseMenu}
        @request-selection=${this.handleRequestSelection}
        @request-deselection=${this.handleRequestDeselection}>
        ${this.renderMenuContent()}
      </md-menu>
    </div>`;
        }

        renderMenuContent() {
          return v`<slot></slot>`;
        }

        handleKeydown(e) {
          if (this.open || this.disabled || !this.menu) return;
          const t = this.menu.typeaheadController;
          const r =
            e.code === "Space" ||
            e.code === "ArrowDown" ||
            e.code === "ArrowUp" ||
            e.code === "End" ||
            e.code === "Home" ||
            e.code === "Enter";
          if (!t.isTypingAhead && r) {
            switch ((e.preventDefault(), (this.open = !0), e.code)) {
              case "Space":
              case "ArrowDown":
              case "Enter":
                this.defaultFocus = re.NONE;
                break;
              case "End":
                this.defaultFocus = re.LAST_ITEM;
                break;
              case "ArrowUp":
              case "Home":
                this.defaultFocus = re.FIRST_ITEM;
                break;
              default:
                break;
            }
            return;
          }
          if (e.key.length === 1) {
            (t.onKeydown(e), e.preventDefault());
            const { lastActiveRecord: n } = t;
            if (!n) return;
            (this.labelEl?.setAttribute?.("aria-live", "polite"),
              this.selectItem(n[se.ITEM]) && this.dispatchInteractionEvents());
          }
        }

        handleClick() {
          this.open = !this.open;
        }

        handleFocus() {
          this.focused = !0;
        }

        handleBlur() {
          this.focused = !1;
        }

        handleFocusout(e) {
          (e.relatedTarget && Ut(e.relatedTarget, this)) || (this.open = !1);
        }

        getSelectedOptions() {
          if (!this.menu) return ((this.lastSelectedOptionRecords = []), null);
          const e = this.menu.items;
          return (
            (this.lastSelectedOptionRecords = aa(e)),
            this.lastSelectedOptionRecords
          );
        }

        async getUpdateComplete() {
          return (await this.menu?.updateComplete, super.getUpdateComplete());
        }

        updateValueAndDisplayText() {
          const e = this.getSelectedOptions() ?? [];
          let t = !1;
          if (e.length) {
            const [r] = e[0];
            ((t = this.lastSelectedOption !== r),
              (this.lastSelectedOption = r),
              (this[jo] = r.value),
              (this.displayText = r.displayText));
          } else
            ((t = this.lastSelectedOption !== null),
              (this.lastSelectedOption = null),
              (this[jo] = ""),
              (this.displayText = ""));
          return t;
        }

        async handleOpening(e) {
          if (
            (this.labelEl?.removeAttribute?.("aria-live"),
            this.redispatchEvent(e),
            this.defaultFocus !== re.NONE)
          )
            return;
          const t = this.menu.items;
          const r = ze(t)?.item;
          let [i] = this.lastSelectedOptionRecords[0] ?? [null];
          (r && r !== i && (r.tabIndex = -1),
            (i = i ?? t[0]),
            i && ((i.tabIndex = 0), i.focus()));
        }

        redispatchEvent(e) {
          ut(this, e);
        }

        handleClosed(e) {
          ((this.open = !1), this.redispatchEvent(e));
        }

        handleCloseMenu(e) {
          const t = e.detail.reason;
          const r = e.detail.itemPath[0];
          this.open = !1;
          let i = !1;
          (t.kind === "click-selection"
            ? (i = this.selectItem(r))
            : t.kind === "keydown" && ta(t.key)
              ? (i = this.selectItem(r))
              : ((r.tabIndex = -1), r.blur()),
            i && this.dispatchInteractionEvents());
        }

        selectItem(e) {
          return (
            (this.getSelectedOptions() ?? []).forEach(([r]) => {
              e !== r && (r.selected = !1);
            }),
            (e.selected = !0),
            this.updateValueAndDisplayText()
          );
        }

        handleRequestSelection(e) {
          const t = e.target;
          this.lastSelectedOptionRecords.some(([r]) => r === t) ||
            this.selectItem(t);
        }

        handleRequestDeselection(e) {
          const t = e.target;
          this.lastSelectedOptionRecords.some(([r]) => r === t) &&
            this.updateValueAndDisplayText();
        }

        initUserSelection() {
          this.lastUserSetValue && !this.lastSelectedOptionRecords.length
            ? this.select(this.lastUserSetValue)
            : this.lastUserSetSelectedIndex !== null &&
                !this.lastSelectedOptionRecords.length
              ? this.selectIndex(this.lastUserSetSelectedIndex)
              : this.updateValueAndDisplayText();
        }

        handleIconChange() {
          this.hasLeadingIcon = this.leadingIcons.length > 0;
        }

        dispatchInteractionEvents() {
          (this.dispatchEvent(
            new Event("input", { bubbles: !0, composed: !0 }),
          ),
            this.dispatchEvent(new Event("change", { bubbles: !0 })));
        }

        getErrorText() {
          return this.error ? this.errorText : this.nativeErrorText;
        }

        [Xe]() {
          return this.value;
        }

        formResetCallback() {
          this.reset();
        }

        formStateRestoreCallback(e) {
          this.value = e;
        }

        click() {
          this.field?.click();
        }

        [ht]() {
          return new Wo(() => this);
        }

        [mt]() {
          return this.field;
        }
      }));
    O.shadowRootOptions = { ...E.shadowRootOptions, delegatesFocus: !0 };
    a([p({ type: Boolean })], O.prototype, "quick", void 0);
    a([p({ type: Boolean })], O.prototype, "required", void 0);
    a(
      [p({ type: String, attribute: "error-text" })],
      O.prototype,
      "errorText",
      void 0,
    );
    a([p()], O.prototype, "label", void 0);
    a(
      [p({ type: Boolean, attribute: "no-asterisk" })],
      O.prototype,
      "noAsterisk",
      void 0,
    );
    a(
      [p({ type: String, attribute: "supporting-text" })],
      O.prototype,
      "supportingText",
      void 0,
    );
    a([p({ type: Boolean, reflect: !0 })], O.prototype, "error", void 0);
    a(
      [p({ attribute: "menu-positioning" })],
      O.prototype,
      "menuPositioning",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "clamp-menu-width" })],
      O.prototype,
      "clampMenuWidth",
      void 0,
    );
    a(
      [p({ type: Number, attribute: "typeahead-delay" })],
      O.prototype,
      "typeaheadDelay",
      void 0,
    );
    a(
      [p({ type: Boolean, attribute: "has-leading-icon" })],
      O.prototype,
      "hasLeadingIcon",
      void 0,
    );
    a([p({ attribute: "display-text" })], O.prototype, "displayText", void 0);
    a([p({ attribute: "menu-align" })], O.prototype, "menuAlign", void 0);
    a([p()], O.prototype, "value", null);
    a(
      [p({ type: Number, attribute: "selected-index" })],
      O.prototype,
      "selectedIndex",
      null,
    );
    a([M()], O.prototype, "nativeError", void 0);
    a([M()], O.prototype, "nativeErrorText", void 0);
    a([M()], O.prototype, "focused", void 0);
    a([M()], O.prototype, "open", void 0);
    a([M()], O.prototype, "defaultFocus", void 0);
    a([S(".field")], O.prototype, "field", void 0);
    a([S("md-menu")], O.prototype, "menu", void 0);
    a([S("#label")], O.prototype, "labelEl", void 0);
    a(
      [Z({ slot: "leading-icon", flatten: !0 })],
      O.prototype,
      "leadingIcons",
      void 0,
    );
  });
  let Ko;
  const pa = d(() => {
    Io();
    De();
    ca();
    Ko = class extends O {
      constructor() {
        (super(...arguments), (this.fieldTag = ne`md-outlined-field`));
      }
    };
  });
  let ua;
  const ha = d(() => {
    y();
    ua = x`:host{--_text-field-disabled-input-text-color: var(--md-outlined-select-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-input-text-opacity: var(--md-outlined-select-text-field-disabled-input-text-opacity, 0.38);--_text-field-disabled-label-text-color: var(--md-outlined-select-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-label-text-opacity: var(--md-outlined-select-text-field-disabled-label-text-opacity, 0.38);--_text-field-disabled-leading-icon-color: var(--md-outlined-select-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-leading-icon-opacity: var(--md-outlined-select-text-field-disabled-leading-icon-opacity, 0.38);--_text-field-disabled-outline-color: var(--md-outlined-select-text-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-outline-opacity: var(--md-outlined-select-text-field-disabled-outline-opacity, 0.12);--_text-field-disabled-outline-width: var(--md-outlined-select-text-field-disabled-outline-width, 1px);--_text-field-disabled-supporting-text-color: var(--md-outlined-select-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-supporting-text-opacity: var(--md-outlined-select-text-field-disabled-supporting-text-opacity, 0.38);--_text-field-disabled-trailing-icon-color: var(--md-outlined-select-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-trailing-icon-opacity: var(--md-outlined-select-text-field-disabled-trailing-icon-opacity, 0.38);--_text-field-error-focus-input-text-color: var(--md-outlined-select-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-focus-label-text-color: var(--md-outlined-select-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-leading-icon-color: var(--md-outlined-select-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-focus-outline-color: var(--md-outlined-select-text-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-supporting-text-color: var(--md-outlined-select-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-trailing-icon-color: var(--md-outlined-select-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-input-text-color: var(--md-outlined-select-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-hover-label-text-color: var(--md-outlined-select-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-leading-icon-color: var(--md-outlined-select-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-hover-outline-color: var(--md-outlined-select-text-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-supporting-text-color: var(--md-outlined-select-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-trailing-icon-color: var(--md-outlined-select-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-input-text-color: var(--md-outlined-select-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-label-text-color: var(--md-outlined-select-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-leading-icon-color: var(--md-outlined-select-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-outline-color: var(--md-outlined-select-text-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_text-field-error-supporting-text-color: var(--md-outlined-select-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-trailing-icon-color: var(--md-outlined-select-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-focus-input-text-color: var(--md-outlined-select-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-focus-label-text-color: var(--md-outlined-select-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-leading-icon-color: var(--md-outlined-select-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-outline-color: var(--md-outlined-select-text-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-outline-width: var(--md-outlined-select-text-field-focus-outline-width, 3px);--_text-field-focus-supporting-text-color: var(--md-outlined-select-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-trailing-icon-color: var(--md-outlined-select-text-field-focus-trailing-icon-color, var(--md-sys-color-primary, #6750a4));--_text-field-hover-input-text-color: var(--md-outlined-select-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-label-text-color: var(--md-outlined-select-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-leading-icon-color: var(--md-outlined-select-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-outline-color: var(--md-outlined-select-text-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-outline-width: var(--md-outlined-select-text-field-hover-outline-width, 1px);--_text-field-hover-supporting-text-color: var(--md-outlined-select-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-trailing-icon-color: var(--md-outlined-select-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-input-text-color: var(--md-outlined-select-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-input-text-font: var(--md-outlined-select-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-input-text-line-height: var(--md-outlined-select-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-input-text-size: var(--md-outlined-select-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-input-text-weight: var(--md-outlined-select-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-label-text-color: var(--md-outlined-select-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-label-text-font: var(--md-outlined-select-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-label-text-line-height: var(--md-outlined-select-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-label-text-populated-line-height: var(--md-outlined-select-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-label-text-populated-size: var(--md-outlined-select-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-label-text-size: var(--md-outlined-select-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-label-text-weight: var(--md-outlined-select-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-leading-icon-color: var(--md-outlined-select-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-leading-icon-size: var(--md-outlined-select-text-field-leading-icon-size, 24px);--_text-field-outline-color: var(--md-outlined-select-text-field-outline-color, var(--md-sys-color-outline, #79747e));--_text-field-outline-width: var(--md-outlined-select-text-field-outline-width, 1px);--_text-field-supporting-text-color: var(--md-outlined-select-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-supporting-text-font: var(--md-outlined-select-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-supporting-text-line-height: var(--md-outlined-select-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-supporting-text-size: var(--md-outlined-select-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-supporting-text-weight: var(--md-outlined-select-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-trailing-icon-color: var(--md-outlined-select-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-trailing-icon-size: var(--md-outlined-select-text-field-trailing-icon-size, 24px);--_text-field-container-shape-start-start: var(--md-outlined-select-text-field-container-shape-start-start, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-start-end: var(--md-outlined-select-text-field-container-shape-start-end, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-end-end: var(--md-outlined-select-text-field-container-shape-end-end, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-end-start: var(--md-outlined-select-text-field-container-shape-end-start, var(--md-outlined-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--md-outlined-field-container-shape-end-end: var(--_text-field-container-shape-end-end);--md-outlined-field-container-shape-end-start: var(--_text-field-container-shape-end-start);--md-outlined-field-container-shape-start-end: var(--_text-field-container-shape-start-end);--md-outlined-field-container-shape-start-start: var(--_text-field-container-shape-start-start);--md-outlined-field-content-color: var(--_text-field-input-text-color);--md-outlined-field-content-font: var(--_text-field-input-text-font);--md-outlined-field-content-line-height: var(--_text-field-input-text-line-height);--md-outlined-field-content-size: var(--_text-field-input-text-size);--md-outlined-field-content-weight: var(--_text-field-input-text-weight);--md-outlined-field-disabled-content-color: var(--_text-field-disabled-input-text-color);--md-outlined-field-disabled-content-opacity: var(--_text-field-disabled-input-text-opacity);--md-outlined-field-disabled-label-text-color: var(--_text-field-disabled-label-text-color);--md-outlined-field-disabled-label-text-opacity: var(--_text-field-disabled-label-text-opacity);--md-outlined-field-disabled-leading-content-color: var(--_text-field-disabled-leading-icon-color);--md-outlined-field-disabled-leading-content-opacity: var(--_text-field-disabled-leading-icon-opacity);--md-outlined-field-disabled-outline-color: var(--_text-field-disabled-outline-color);--md-outlined-field-disabled-outline-opacity: var(--_text-field-disabled-outline-opacity);--md-outlined-field-disabled-outline-width: var(--_text-field-disabled-outline-width);--md-outlined-field-disabled-supporting-text-color: var(--_text-field-disabled-supporting-text-color);--md-outlined-field-disabled-supporting-text-opacity: var(--_text-field-disabled-supporting-text-opacity);--md-outlined-field-disabled-trailing-content-color: var(--_text-field-disabled-trailing-icon-color);--md-outlined-field-disabled-trailing-content-opacity: var(--_text-field-disabled-trailing-icon-opacity);--md-outlined-field-error-content-color: var(--_text-field-error-input-text-color);--md-outlined-field-error-focus-content-color: var(--_text-field-error-focus-input-text-color);--md-outlined-field-error-focus-label-text-color: var(--_text-field-error-focus-label-text-color);--md-outlined-field-error-focus-leading-content-color: var(--_text-field-error-focus-leading-icon-color);--md-outlined-field-error-focus-outline-color: var(--_text-field-error-focus-outline-color);--md-outlined-field-error-focus-supporting-text-color: var(--_text-field-error-focus-supporting-text-color);--md-outlined-field-error-focus-trailing-content-color: var(--_text-field-error-focus-trailing-icon-color);--md-outlined-field-error-hover-content-color: var(--_text-field-error-hover-input-text-color);--md-outlined-field-error-hover-label-text-color: var(--_text-field-error-hover-label-text-color);--md-outlined-field-error-hover-leading-content-color: var(--_text-field-error-hover-leading-icon-color);--md-outlined-field-error-hover-outline-color: var(--_text-field-error-hover-outline-color);--md-outlined-field-error-hover-supporting-text-color: var(--_text-field-error-hover-supporting-text-color);--md-outlined-field-error-hover-trailing-content-color: var(--_text-field-error-hover-trailing-icon-color);--md-outlined-field-error-label-text-color: var(--_text-field-error-label-text-color);--md-outlined-field-error-leading-content-color: var(--_text-field-error-leading-icon-color);--md-outlined-field-error-outline-color: var(--_text-field-error-outline-color);--md-outlined-field-error-supporting-text-color: var(--_text-field-error-supporting-text-color);--md-outlined-field-error-trailing-content-color: var(--_text-field-error-trailing-icon-color);--md-outlined-field-focus-content-color: var(--_text-field-focus-input-text-color);--md-outlined-field-focus-label-text-color: var(--_text-field-focus-label-text-color);--md-outlined-field-focus-leading-content-color: var(--_text-field-focus-leading-icon-color);--md-outlined-field-focus-outline-color: var(--_text-field-focus-outline-color);--md-outlined-field-focus-outline-width: var(--_text-field-focus-outline-width);--md-outlined-field-focus-supporting-text-color: var(--_text-field-focus-supporting-text-color);--md-outlined-field-focus-trailing-content-color: var(--_text-field-focus-trailing-icon-color);--md-outlined-field-hover-content-color: var(--_text-field-hover-input-text-color);--md-outlined-field-hover-label-text-color: var(--_text-field-hover-label-text-color);--md-outlined-field-hover-leading-content-color: var(--_text-field-hover-leading-icon-color);--md-outlined-field-hover-outline-color: var(--_text-field-hover-outline-color);--md-outlined-field-hover-outline-width: var(--_text-field-hover-outline-width);--md-outlined-field-hover-supporting-text-color: var(--_text-field-hover-supporting-text-color);--md-outlined-field-hover-trailing-content-color: var(--_text-field-hover-trailing-icon-color);--md-outlined-field-label-text-color: var(--_text-field-label-text-color);--md-outlined-field-label-text-font: var(--_text-field-label-text-font);--md-outlined-field-label-text-line-height: var(--_text-field-label-text-line-height);--md-outlined-field-label-text-populated-line-height: var(--_text-field-label-text-populated-line-height);--md-outlined-field-label-text-populated-size: var(--_text-field-label-text-populated-size);--md-outlined-field-label-text-size: var(--_text-field-label-text-size);--md-outlined-field-label-text-weight: var(--_text-field-label-text-weight);--md-outlined-field-leading-content-color: var(--_text-field-leading-icon-color);--md-outlined-field-outline-color: var(--_text-field-outline-color);--md-outlined-field-outline-width: var(--_text-field-outline-width);--md-outlined-field-supporting-text-color: var(--_text-field-supporting-text-color);--md-outlined-field-supporting-text-font: var(--_text-field-supporting-text-font);--md-outlined-field-supporting-text-line-height: var(--_text-field-supporting-text-line-height);--md-outlined-field-supporting-text-size: var(--_text-field-supporting-text-size);--md-outlined-field-supporting-text-weight: var(--_text-field-supporting-text-weight);--md-outlined-field-trailing-content-color: var(--_text-field-trailing-icon-color)}[has-start] .icon.leading{font-size:var(--_text-field-leading-icon-size);height:var(--_text-field-leading-icon-size);width:var(--_text-field-leading-icon-size)}.icon.trailing{font-size:var(--_text-field-trailing-icon-size);height:var(--_text-field-trailing-icon-size);width:var(--_text-field-trailing-icon-size)}
`;
  });
  let ma;
  const fa = d(() => {
    y();
    ma = x`:host{color:unset;min-width:210px;display:flex}.field{cursor:default;outline:none}.select{position:relative;flex-direction:column}.icon.trailing svg,.icon ::slotted(*){fill:currentColor}.icon ::slotted(*){width:inherit;height:inherit;font-size:inherit}.icon slot{display:flex;height:100%;width:100%;align-items:center;justify-content:center}.icon.trailing :is(.up,.down){opacity:0;transition:opacity 75ms linear 75ms}.select:not(.open) .down,.select.open .up{opacity:1}.field,.select,md-menu{min-width:inherit;width:inherit;max-width:inherit;display:flex}md-menu{min-width:var(--__menu-min-width);max-width:var(--__menu-max-width, inherit)}.menu-wrapper{width:0px;height:0px;max-width:inherit}md-menu ::slotted(:not[disabled]){cursor:pointer}.field,.select{width:100%}:host{display:inline-flex}:host([disabled]){pointer-events:none}
`;
  });
  let bi;
  const va = d(() => {
    T();
    I();
    pa();
    ha();
    fa();
    bi = class extends Ko {};
    bi.styles = [ma, ua];
    bi = a([C("md-outlined-select")], bi);
  });
  let ga;
  const ya = d(() => {
    y();
    ga = x`:host{display:flex;--md-ripple-hover-color: var(--md-menu-item-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-menu-item-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-menu-item-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-menu-item-pressed-state-layer-opacity, 0.12)}:host([disabled]){opacity:var(--md-menu-item-disabled-opacity, 0.3);pointer-events:none}md-focus-ring{z-index:1;--md-focus-ring-shape: 8px}a,button,li{background:none;border:none;padding:0;margin:0;text-align:unset;text-decoration:none}.list-item{border-radius:inherit;display:flex;flex:1;max-width:inherit;min-width:inherit;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0)}.list-item:not(.disabled){cursor:pointer}[slot=container]{pointer-events:none}md-ripple{border-radius:inherit}md-item{border-radius:inherit;flex:1;color:var(--md-menu-item-label-text-color, var(--md-sys-color-on-surface, #1d1b20));font-family:var(--md-menu-item-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));line-height:var(--md-menu-item-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));font-weight:var(--md-menu-item-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));min-height:var(--md-menu-item-one-line-container-height, 56px);padding-top:var(--md-menu-item-top-space, 12px);padding-bottom:var(--md-menu-item-bottom-space, 12px);padding-inline-start:var(--md-menu-item-leading-space, 16px);padding-inline-end:var(--md-menu-item-trailing-space, 16px)}md-item[multiline]{min-height:var(--md-menu-item-two-line-container-height, 72px)}[slot=supporting-text]{color:var(--md-menu-item-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-menu-item-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));font-weight:var(--md-menu-item-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)))}[slot=trailing-supporting-text]{color:var(--md-menu-item-trailing-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-trailing-supporting-text-font, var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-trailing-supporting-text-size, var(--md-sys-typescale-label-small-size, 0.6875rem));line-height:var(--md-menu-item-trailing-supporting-text-line-height, var(--md-sys-typescale-label-small-line-height, 1rem));font-weight:var(--md-menu-item-trailing-supporting-text-weight, var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)))}:is([slot=start],[slot=end])::slotted(*){fill:currentColor}[slot=start]{color:var(--md-menu-item-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}[slot=end]{color:var(--md-menu-item-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}.list-item{background-color:var(--md-menu-item-container-color, transparent)}.list-item.selected{background-color:var(--md-menu-item-selected-container-color, var(--md-sys-color-secondary-container, #e8def8))}.selected:not(.disabled) ::slotted(*){color:var(--md-menu-item-selected-label-text-color, var(--md-sys-color-on-secondary-container, #1d192b))}@media(forced-colors: active){:host([disabled]),:host([disabled]) slot{color:GrayText;opacity:1}.list-item{position:relative}.list-item.selected::before{content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:inherit;pointer-events:none;border:3px double CanvasText}}
`;
  });
  function _c(o) {
    for (const e of o.assignedNodes({ flatten: !0 })) {
      const t = e.nodeType === Node.ELEMENT_NODE;
      const r = e.nodeType === Node.TEXT_NODE && e.textContent?.match(/\S/);
      if (t || r) return !0;
    }
    return !1;
  }
  let yt;
  const ba = d(() => {
    T();
    y();
    I();
    yt = class extends E {
      constructor() {
        (super(...arguments), (this.multiline = !1));
      }

      render() {
        return v`
      <slot name="container"></slot>
      <slot class="non-text" name="start"></slot>
      <div class="text">
        <slot name="overline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          class="default-slot"
          @slotchange=${this.handleTextSlotChange}></slot>
        <slot name="headline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          name="supporting-text"
          @slotchange=${this.handleTextSlotChange}></slot>
      </div>
      <slot class="non-text" name="trailing-supporting-text"></slot>
      <slot class="non-text" name="end"></slot>
    `;
      }

      handleTextSlotChange() {
        let e = !1;
        let t = 0;
        for (const r of this.textSlots)
          if ((_c(r) && (t += 1), t > 1)) {
            e = !0;
            break;
          }
        this.multiline = e;
      }
    };
    a([p({ type: Boolean, reflect: !0 })], yt.prototype, "multiline", void 0);
    a([fn(".text slot")], yt.prototype, "textSlots", void 0);
  });
  let xa;
  const _a = d(() => {
    y();
    xa = x`:host{color:var(--md-sys-color-on-surface, #1d1b20);font-family:var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-large-size, 1rem);font-weight:var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-large-line-height, 1.5rem);align-items:center;box-sizing:border-box;display:flex;gap:16px;min-height:56px;overflow:hidden;padding:12px 16px;position:relative;text-overflow:ellipsis}:host([multiline]){min-height:72px}[name=overline]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-medium-size, 0.875rem);font-weight:var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-medium-line-height, 1.25rem)}[name=trailing-supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=container]::slotted(*){inset:0;position:absolute}.default-slot{display:inline}.default-slot,.text ::slotted(*){overflow:hidden;text-overflow:ellipsis}.text{display:flex;flex:1;flex-direction:column;overflow:hidden}
`;
  });
  let xi;
  const _i = d(() => {
    T();
    I();
    ba();
    _a();
    xi = class extends yt {};
    xi.styles = [xa];
    xi = a([C("md-item")], xi);
  });
  let Go;
  const wa = d(() => {
    Ht();
    Go = class {
      constructor(e, t) {
        ((this.host = e),
          (this.internalTypeaheadText = null),
          (this.onClick = () => {
            this.host.keepOpen ||
              this.host.dispatchEvent(
                mi(this.host, { kind: Fo.CLICK_SELECTION }),
              );
          }),
          (this.onKeydown = (r) => {
            if (this.host.href && r.code === "Enter") {
              const n = this.getInteractiveElement();
              n instanceof HTMLAnchorElement && n.click();
            }
            if (r.defaultPrevented) return;
            const i = r.code;
            (this.host.keepOpen && i !== "Escape") ||
              (Uo(i) &&
                (r.preventDefault(),
                this.host.dispatchEvent(
                  mi(this.host, { kind: Fo.KEYDOWN, key: i }),
                )));
          }),
          (this.getHeadlineElements = t.getHeadlineElements),
          (this.getSupportingTextElements = t.getSupportingTextElements),
          (this.getDefaultElements = t.getDefaultElements),
          (this.getInteractiveElement = t.getInteractiveElement),
          this.host.addController(this));
      }

      get typeaheadText() {
        if (this.internalTypeaheadText !== null)
          return this.internalTypeaheadText;
        const e = this.getHeadlineElements();
        const t = [];
        return (
          e.forEach((r) => {
            r.textContent &&
              r.textContent.trim() &&
              t.push(r.textContent.trim());
          }),
          t.length === 0 &&
            this.getDefaultElements().forEach((r) => {
              r.textContent &&
                r.textContent.trim() &&
                t.push(r.textContent.trim());
            }),
          t.length === 0 &&
            this.getSupportingTextElements().forEach((r) => {
              r.textContent &&
                r.textContent.trim() &&
                t.push(r.textContent.trim());
            }),
          t.join(" ")
        );
      }

      get tagName() {
        switch (this.host.type) {
          case "link":
            return "a";
          case "button":
            return "button";
          default:
          case "menuitem":
          case "option":
            return "li";
        }
      }

      get role() {
        return this.host.type === "option" ? "option" : "menuitem";
      }

      hostConnected() {
        this.host.toggleAttribute("md-menu-item", !0);
      }

      hostUpdate() {
        this.host.href && (this.host.type = "link");
      }

      setTypeaheadText(e) {
        this.internalTypeaheadText = e;
      }
    };
  });
  function wc() {
    return new Event("request-selection", { bubbles: !0, composed: !0 });
  }
  function Ec() {
    return new Event("request-deselection", { bubbles: !0, composed: !0 });
  }
  let Yo;
  const Ea = d(() => {
    wa();
    Yo = class {
      get role() {
        return this.menuItemController.role;
      }

      get typeaheadText() {
        return this.menuItemController.typeaheadText;
      }

      setTypeaheadText(e) {
        this.menuItemController.setTypeaheadText(e);
      }

      get displayText() {
        return this.internalDisplayText !== null
          ? this.internalDisplayText
          : this.menuItemController.typeaheadText;
      }

      setDisplayText(e) {
        this.internalDisplayText = e;
      }

      constructor(e, t) {
        ((this.host = e),
          (this.internalDisplayText = null),
          (this.firstUpdate = !0),
          (this.onClick = () => {
            this.menuItemController.onClick();
          }),
          (this.onKeydown = (r) => {
            this.menuItemController.onKeydown(r);
          }),
          (this.lastSelected = this.host.selected),
          (this.menuItemController = new Go(e, t)),
          e.addController(this));
      }

      hostUpdate() {
        this.lastSelected !== this.host.selected &&
          (this.host.ariaSelected = this.host.selected ? "true" : "false");
      }

      hostUpdated() {
        (this.lastSelected !== this.host.selected &&
          !this.firstUpdate &&
          (this.host.selected
            ? this.host.dispatchEvent(wc())
            : this.host.dispatchEvent(Ec())),
          (this.lastSelected = this.host.selected),
          (this.firstUpdate = !1));
      }
    };
  });
  let Ac;
  let ee;
  const Aa = d(() => {
    T();
    dt();
    _i();
    zt();
    y();
    I();
    ge();
    ke();
    Ea();
    ((Ac = oe(E)),
      (ee = class extends Ac {
        constructor() {
          (super(...arguments),
            (this.disabled = !1),
            (this.isMenuItem = !0),
            (this.selected = !1),
            (this.value = ""),
            (this.type = "option"),
            (this.selectOptionController = new Yo(this, {
              getHeadlineElements: () => this.headlineElements,
              getSupportingTextElements: () => this.supportingTextElements,
              getDefaultElements: () => this.defaultElements,
              getInteractiveElement: () => this.listItemRoot,
            })));
        }

        get typeaheadText() {
          return this.selectOptionController.typeaheadText;
        }

        set typeaheadText(e) {
          this.selectOptionController.setTypeaheadText(e);
        }

        get displayText() {
          return this.selectOptionController.displayText;
        }

        set displayText(e) {
          this.selectOptionController.setDisplayText(e);
        }

        render() {
          return this.renderListItem(v`
      <md-item>
        <div slot="container">
          ${this.renderRipple()} ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `);
        }

        renderListItem(e) {
          return v`
      <li
        id="item"
        tabindex=${this.disabled ? -1 : 0}
        role=${this.selectOptionController.role}
        aria-label=${this.ariaLabel || u}
        aria-selected=${this.ariaSelected || u}
        aria-checked=${this.ariaChecked || u}
        aria-expanded=${this.ariaExpanded || u}
        aria-haspopup=${this.ariaHasPopup || u}
        class="list-item ${K(this.getRenderClasses())}"
        @click=${this.selectOptionController.onClick}
        @keydown=${this.selectOptionController.onKeydown}
        >${e}</li
      >
    `;
        }

        renderRipple() {
          return v` <md-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}></md-ripple>`;
        }

        renderFocusRing() {
          return v` <md-focus-ring
      part="focus-ring"
      for="item"
      inward></md-focus-ring>`;
        }

        getRenderClasses() {
          return { disabled: this.disabled, selected: this.selected };
        }

        renderBody() {
          return v`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot
        name="trailing-supporting-text"
        slot="trailing-supporting-text"></slot>
    `;
        }

        focus() {
          this.listItemRoot?.focus();
        }
      }));
    ee.shadowRootOptions = { ...E.shadowRootOptions, delegatesFocus: !0 };
    a([p({ type: Boolean, reflect: !0 })], ee.prototype, "disabled", void 0);
    a(
      [p({ type: Boolean, attribute: "md-menu-item", reflect: !0 })],
      ee.prototype,
      "isMenuItem",
      void 0,
    );
    a([p({ type: Boolean })], ee.prototype, "selected", void 0);
    a([p()], ee.prototype, "value", void 0);
    a([S(".list-item")], ee.prototype, "listItemRoot", void 0);
    a([Z({ slot: "headline" })], ee.prototype, "headlineElements", void 0);
    a(
      [Z({ slot: "supporting-text" })],
      ee.prototype,
      "supportingTextElements",
      void 0,
    );
    a([bn({ slot: "" })], ee.prototype, "defaultElements", void 0);
    a(
      [p({ attribute: "typeahead-text" })],
      ee.prototype,
      "typeaheadText",
      null,
    );
    a([p({ attribute: "display-text" })], ee.prototype, "displayText", null);
  });
  let wi;
  const Ca = d(() => {
    T();
    I();
    ya();
    Aa();
    wi = class extends ee {};
    wi.styles = [ga];
    wi = a([C("md-select-option")], wi);
  });
  let Cc;
  let Vt;
  const Ta = d(() => {
    T();
    y();
    I();
    ui();
    ((Cc = new Set(Object.values(Y))),
      (Vt = class extends E {
        get items() {
          return this.listController.items;
        }

        constructor() {
          (super(),
            (this.listController = new gt({
              isItem: (e) => e.hasAttribute("md-list-item"),
              getPossibleItems: () => this.slotItems,
              isRtl: () => getComputedStyle(this).direction === "rtl",
              deactivateItem: (e) => {
                e.tabIndex = -1;
              },
              activateItem: (e) => {
                e.tabIndex = 0;
              },
              isNavigableKey: (e) => Cc.has(e),
              isActivatable: (e) => !e.disabled && e.type !== "text",
            })),
            (this.internals = this.attachInternals()),
            (this.internals.role = "list"),
            this.addEventListener(
              "keydown",
              this.listController.handleKeydown,
            ));
        }

        render() {
          return v`
      <slot
        @deactivate-items=${this.listController.onDeactivateItems}
        @request-activation=${this.listController.onRequestActivation}
        @slotchange=${this.listController.onSlotchange}>
      </slot>
    `;
        }

        activateNextItem() {
          return this.listController.activateNextItem();
        }

        activatePreviousItem() {
          return this.listController.activatePreviousItem();
        }
      }));
    a([Z({ flatten: !0 })], Vt.prototype, "slotItems", void 0);
  });
  let Ia;
  const Sa = d(() => {
    y();
    Ia = x`:host{background:var(--md-list-container-color, var(--md-sys-color-surface, #fef7ff));color:unset;display:flex;flex-direction:column;outline:none;padding:8px 0;position:relative}
`;
  });
  let Ei;
  const $a = d(() => {
    T();
    I();
    Ta();
    Sa();
    Ei = class extends Vt {};
    Ei.styles = [Ia];
    Ei = a([C("md-list")], Ei);
  });
  let Tc;
  let ue;
  const Ra = d(() => {
    T();
    dt();
    _i();
    zt();
    y();
    I();
    ge();
    De();
    ke();
    Ft();
    ((Tc = oe(E)),
      (ue = class extends Tc {
        constructor() {
          (super(...arguments),
            (this.disabled = !1),
            (this.type = "text"),
            (this.isListItem = !0),
            (this.href = ""),
            (this.target = ""));
        }

        get isDisabled() {
          return this.disabled && this.type !== "link";
        }

        willUpdate(e) {
          (this.href && (this.type = "link"), super.willUpdate(e));
        }

        render() {
          return this.renderListItem(v`
      <md-item>
        <div slot="container">
          ${this.renderRipple()} ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `);
        }

        renderListItem(e) {
          const t = this.type === "link";
          let r;
          switch (this.type) {
            case "link":
              r = ne`a`;
              break;
            case "button":
              r = ne`button`;
              break;
            default:
            case "text":
              r = ne`li`;
              break;
          }
          const i = this.type !== "text";
          const n = t && this.target ? this.target : u;
          return Me`
      <${r}
        id="item"
        tabindex="${this.isDisabled || !i ? -1 : 0}"
        ?disabled=${this.isDisabled}
        role="listitem"
        aria-selected=${this.ariaSelected || u}
        aria-checked=${this.ariaChecked || u}
        aria-expanded=${this.ariaExpanded || u}
        aria-haspopup=${this.ariaHasPopup || u}
        class="list-item ${K(this.getRenderClasses())}"
        href=${this.href || u}
        target=${n}
        @focus=${this.onFocus}
      >${e}</${r}>
    `;
        }

        renderRipple() {
          return this.type === "text"
            ? u
            : v` <md-ripple
      part="ripple"
      for="item"
      ?disabled=${this.isDisabled}></md-ripple>`;
        }

        renderFocusRing() {
          return this.type === "text"
            ? u
            : v` <md-focus-ring
      @visibility-changed=${this.onFocusRingVisibilityChanged}
      part="focus-ring"
      for="item"
      inward></md-focus-ring>`;
        }

        onFocusRingVisibilityChanged(e) {}

        getRenderClasses() {
          return { disabled: this.isDisabled };
        }

        renderBody() {
          return v`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot
        name="trailing-supporting-text"
        slot="trailing-supporting-text"></slot>
    `;
        }

        onFocus() {
          this.tabIndex === -1 && this.dispatchEvent(ea());
        }

        focus() {
          this.listItemRoot?.focus();
        }

        click() {
          if (!this.listItemRoot) {
            super.click();
            return;
          }
          this.listItemRoot.click();
        }
      }));
    ue.shadowRootOptions = { ...E.shadowRootOptions, delegatesFocus: !0 };
    a([p({ type: Boolean, reflect: !0 })], ue.prototype, "disabled", void 0);
    a([p({ reflect: !0 })], ue.prototype, "type", void 0);
    a(
      [p({ type: Boolean, attribute: "md-list-item", reflect: !0 })],
      ue.prototype,
      "isListItem",
      void 0,
    );
    a([p()], ue.prototype, "href", void 0);
    a([p()], ue.prototype, "target", void 0);
    a([S(".list-item")], ue.prototype, "listItemRoot", void 0);
  });
  let Oa;
  const Pa = d(() => {
    y();
    Oa = x`:host{display:flex;-webkit-tap-highlight-color:rgba(0,0,0,0);--md-ripple-hover-color: var(--md-list-item-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-list-item-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-list-item-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-list-item-pressed-state-layer-opacity, 0.12)}:host(:is([type=button]:not([disabled]),[type=link])){cursor:pointer}md-focus-ring{z-index:1;--md-focus-ring-shape: 8px}a,button,li{background:none;border:none;cursor:inherit;padding:0;margin:0;text-align:unset;text-decoration:none}.list-item{border-radius:inherit;display:flex;flex:1;max-width:inherit;min-width:inherit;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0);width:100%}.list-item.interactive{cursor:pointer}.list-item.disabled{opacity:var(--md-list-item-disabled-opacity, 0.3);pointer-events:none}[slot=container]{pointer-events:none}md-ripple{border-radius:inherit}md-item{border-radius:inherit;flex:1;height:100%;color:var(--md-list-item-label-text-color, var(--md-sys-color-on-surface, #1d1b20));font-family:var(--md-list-item-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-list-item-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));line-height:var(--md-list-item-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));font-weight:var(--md-list-item-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));min-height:var(--md-list-item-one-line-container-height, 56px);padding-top:var(--md-list-item-top-space, 12px);padding-bottom:var(--md-list-item-bottom-space, 12px);padding-inline-start:var(--md-list-item-leading-space, 16px);padding-inline-end:var(--md-list-item-trailing-space, 16px)}md-item[multiline]{min-height:var(--md-list-item-two-line-container-height, 72px)}[slot=supporting-text]{color:var(--md-list-item-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-list-item-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-list-item-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-list-item-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));font-weight:var(--md-list-item-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)))}[slot=trailing-supporting-text]{color:var(--md-list-item-trailing-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-list-item-trailing-supporting-text-font, var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-list-item-trailing-supporting-text-size, var(--md-sys-typescale-label-small-size, 0.6875rem));line-height:var(--md-list-item-trailing-supporting-text-line-height, var(--md-sys-typescale-label-small-line-height, 1rem));font-weight:var(--md-list-item-trailing-supporting-text-weight, var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)))}:is([slot=start],[slot=end])::slotted(*){fill:currentColor}[slot=start]{color:var(--md-list-item-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}[slot=end]{color:var(--md-list-item-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}@media(forced-colors: active){.disabled slot{color:GrayText}.list-item.disabled{color:GrayText;opacity:1}}
`;
  });
  let Ai;
  const ka = d(() => {
    T();
    I();
    Ra();
    Pa();
    Ai = class extends ue {};
    Ai.styles = [Oa];
    Ai = a([C("md-list-item")], Ai);
  });
  let Ze;
  const La = d(() => {
    T();
    y();
    I();
    Ze = class extends E {
      constructor() {
        (super(...arguments),
          (this.inset = !1),
          (this.insetStart = !1),
          (this.insetEnd = !1));
      }
    };
    a([p({ type: Boolean, reflect: !0 })], Ze.prototype, "inset", void 0);
    a(
      [p({ type: Boolean, reflect: !0, attribute: "inset-start" })],
      Ze.prototype,
      "insetStart",
      void 0,
    );
    a(
      [p({ type: Boolean, reflect: !0, attribute: "inset-end" })],
      Ze.prototype,
      "insetEnd",
      void 0,
    );
  });
  let Ma;
  const Da = d(() => {
    y();
    Ma = x`:host{box-sizing:border-box;color:var(--md-divider-color, var(--md-sys-color-outline-variant, #cac4d0));display:flex;height:var(--md-divider-thickness, 1px);width:100%}:host([inset]),:host([inset-start]){padding-inline-start:16px}:host([inset]),:host([inset-end]){padding-inline-end:16px}:host::before{background:currentColor;content:"";height:100%;width:100%}@media(forced-colors: active){:host::before{background:CanvasText}}
`;
  });
  let Ci;
  const za = d(() => {
    T();
    I();
    La();
    Da();
    Ci = class extends Ze {};
    Ci.styles = [Ma];
    Ci = a([C("md-divider")], Ci);
  });
  let Ba;
  let Na;
  const Fa = d(() => {
    Dt();
    ((Ba = {
      dialog: [
        [
          [{ transform: "translateY(-50px)" }, { transform: "translateY(0)" }],
          { duration: 500, easing: te.EMPHASIZED },
        ],
      ],
      scrim: [
        [
          [{ opacity: 0 }, { opacity: 0.32 }],
          { duration: 500, easing: "linear" },
        ],
      ],
      container: [
        [
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 50, easing: "linear", pseudoElement: "::before" },
        ],
        [
          [{ height: "35%" }, { height: "100%" }],
          { duration: 500, easing: te.EMPHASIZED, pseudoElement: "::before" },
        ],
      ],
      headline: [
        [
          [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1 }],
          { duration: 250, easing: "linear", fill: "forwards" },
        ],
      ],
      content: [
        [
          [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1 }],
          { duration: 250, easing: "linear", fill: "forwards" },
        ],
      ],
      actions: [
        [
          [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
          { duration: 300, easing: "linear", fill: "forwards" },
        ],
      ],
    }),
      (Na = {
        dialog: [
          [
            [
              { transform: "translateY(0)" },
              { transform: "translateY(-50px)" },
            ],
            { duration: 150, easing: te.EMPHASIZED_ACCELERATE },
          ],
        ],
        scrim: [
          [
            [{ opacity: 0.32 }, { opacity: 0 }],
            { duration: 150, easing: "linear" },
          ],
        ],
        container: [
          [
            [{ height: "100%" }, { height: "35%" }],
            {
              duration: 150,
              easing: te.EMPHASIZED_ACCELERATE,
              pseudoElement: "::before",
            },
          ],
          [
            [{ opacity: "1" }, { opacity: "0" }],
            {
              delay: 100,
              duration: 50,
              easing: "linear",
              pseudoElement: "::before",
            },
          ],
        ],
        headline: [
          [
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 100, easing: "linear", fill: "forwards" },
          ],
        ],
        content: [
          [
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 100, easing: "linear", fill: "forwards" },
          ],
        ],
        actions: [
          [
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 100, easing: "linear", fill: "forwards" },
          ],
        ],
      }));
  });
  function Sc(o) {
    const e =
      ":is(button,input,select,textarea,object,:is(a,area)[href],[tabindex],[contenteditable=true])";
    const t = ":not(:disabled,[disabled])";
    return o.matches(`${e + t}:not([tabindex^="-"])`)
      ? !0
      : !o.localName.includes("-") || !o.matches(t)
        ? !1
        : (o.shadowRoot?.delegatesFocus ?? !1);
  }
  let Ic;
  let U;
  const Ua = d(() => {
    T();
    za();
    y();
    I();
    ge();
    ke();
    $o();
    Fa();
    ((Ic = oe(E)),
      (U = class extends Ic {
        get open() {
          return this.isOpen;
        }

        set open(e) {
          e !== this.isOpen &&
            ((this.isOpen = e),
            e
              ? (this.setAttribute("open", ""), this.show())
              : (this.removeAttribute("open"), this.close()));
        }

        constructor() {
          (super(),
            (this.quick = !1),
            (this.returnValue = ""),
            (this.noFocusTrap = !1),
            (this.getOpenAnimation = () => Ba),
            (this.getCloseAnimation = () => Na),
            (this.isOpen = !1),
            (this.isOpening = !1),
            (this.isConnectedPromise = this.getIsConnectedPromise()),
            (this.isAtScrollTop = !1),
            (this.isAtScrollBottom = !1),
            (this.nextClickIsFromContent = !1),
            (this.hasHeadline = !1),
            (this.hasActions = !1),
            (this.hasIcon = !1),
            (this.escapePressedWithoutCancel = !1),
            (this.treewalker = document.createTreeWalker(
              this,
              NodeFilter.SHOW_ELEMENT,
            )),
            this.addEventListener("submit", this.handleSubmit));
        }

        async show() {
          ((this.isOpening = !0),
            await this.isConnectedPromise,
            await this.updateComplete);
          const e = this.dialog;
          if (e.open || !this.isOpening) {
            this.isOpening = !1;
            return;
          }
          if (!this.dispatchEvent(new Event("open", { cancelable: !0 }))) {
            ((this.open = !1), (this.isOpening = !1));
            return;
          }
          (e.showModal(),
            (this.open = !0),
            this.scroller && (this.scroller.scrollTop = 0),
            this.querySelector("[autofocus]")?.focus(),
            await this.animateDialog(this.getOpenAnimation()),
            this.dispatchEvent(new Event("opened")),
            (this.isOpening = !1));
        }

        async close(e = this.returnValue) {
          if (((this.isOpening = !1), !this.isConnected)) {
            this.open = !1;
            return;
          }
          await this.updateComplete;
          const t = this.dialog;
          if (!t.open || this.isOpening) {
            this.open = !1;
            return;
          }
          const r = this.returnValue;
          if (
            ((this.returnValue = e),
            !this.dispatchEvent(new Event("close", { cancelable: !0 })))
          ) {
            this.returnValue = r;
            return;
          }
          (await this.animateDialog(this.getCloseAnimation()),
            t.close(e),
            (this.open = !1),
            this.dispatchEvent(new Event("closed")));
        }

        connectedCallback() {
          (super.connectedCallback(), this.isConnectedPromiseResolve());
        }

        disconnectedCallback() {
          (super.disconnectedCallback(),
            (this.isConnectedPromise = this.getIsConnectedPromise()));
        }

        render() {
          const e = this.open && !(this.isAtScrollTop && this.isAtScrollBottom);
          const t = {
            "has-headline": this.hasHeadline,
            "has-actions": this.hasActions,
            "has-icon": this.hasIcon,
            scrollable: e,
            "show-top-divider": e && !this.isAtScrollTop,
            "show-bottom-divider": e && !this.isAtScrollBottom,
          };
          const r = this.open && !this.noFocusTrap;
          const i = v`
      <div
        class="focus-trap"
        tabindex="0"
        aria-hidden="true"
        @focus=${this.handleFocusTrapFocus}></div>
    `;
          const { ariaLabel: n } = this;
          return v`
      <div class="scrim"></div>
      <dialog
        class=${K(t)}
        aria-label=${n || u}
        aria-labelledby=${this.hasHeadline ? "headline" : u}
        role=${this.type === "alert" ? "alertdialog" : u}
        @cancel=${this.handleCancel}
        @click=${this.handleDialogClick}
        @close=${this.handleClose}
        @keydown=${this.handleKeydown}
        .returnValue=${this.returnValue || u}>
        ${r ? i : u}
        <div class="container" @click=${this.handleContentClick}>
          <div class="headline">
            <div class="icon" aria-hidden="true">
              <slot name="icon" @slotchange=${this.handleIconChange}></slot>
            </div>
            <h2 id="headline" aria-hidden=${!this.hasHeadline || u}>
              <slot
                name="headline"
                @slotchange=${this.handleHeadlineChange}></slot>
            </h2>
            <md-divider></md-divider>
          </div>
          <div class="scroller">
            <div class="content">
              <div class="top anchor"></div>
              <slot name="content"></slot>
              <div class="bottom anchor"></div>
            </div>
          </div>
          <div class="actions">
            <md-divider></md-divider>
            <slot name="actions" @slotchange=${this.handleActionsChange}></slot>
          </div>
        </div>
        ${r ? i : u}
      </dialog>
    `;
        }

        firstUpdated() {
          ((this.intersectionObserver = new IntersectionObserver(
            (e) => {
              for (const t of e) this.handleAnchorIntersection(t);
            },
            { root: this.scroller },
          )),
            this.intersectionObserver.observe(this.topAnchor),
            this.intersectionObserver.observe(this.bottomAnchor));
        }

        handleDialogClick() {
          if (this.nextClickIsFromContent) {
            this.nextClickIsFromContent = !1;
            return;
          }
          this.dispatchEvent(new Event("cancel", { cancelable: !0 })) &&
            this.close();
        }

        handleContentClick() {
          this.nextClickIsFromContent = !0;
        }

        handleSubmit(e) {
          const t = e.target;
          const { submitter: r } = e;
          t.getAttribute("method") !== "dialog" ||
            !r ||
            this.close(r.getAttribute("value") ?? this.returnValue);
        }

        handleCancel(e) {
          if (e.target !== this.dialog) return;
          this.escapePressedWithoutCancel = !1;
          const t = !ut(this, e);
          (e.preventDefault(), !t && this.close());
        }

        handleClose() {
          this.escapePressedWithoutCancel &&
            ((this.escapePressedWithoutCancel = !1),
            this.dialog?.dispatchEvent(
              new Event("cancel", { cancelable: !0 }),
            ));
        }

        handleKeydown(e) {
          e.key === "Escape" &&
            ((this.escapePressedWithoutCancel = !0),
            setTimeout(() => {
              this.escapePressedWithoutCancel = !1;
            }));
        }

        async animateDialog(e) {
          if (
            (this.cancelAnimations?.abort(),
            (this.cancelAnimations = new AbortController()),
            this.quick)
          )
            return;
          const {
            dialog: t,
            scrim: r,
            container: i,
            headline: n,
            content: s,
            actions: l,
          } = this;
          if (!t || !r || !i || !n || !s || !l) return;
          const {
            container: c,
            dialog: m,
            scrim: f,
            headline: h,
            content: b,
            actions: _,
          } = e;
          const P = [
            [t, m ?? []],
            [r, f ?? []],
            [i, c ?? []],
            [n, h ?? []],
            [s, b ?? []],
            [l, _ ?? []],
          ];
          const $ = [];
          for (const [D, k] of P)
            for (const w of k) {
              const L = D.animate(...w);
              (this.cancelAnimations.signal.addEventListener("abort", () => {
                L.cancel();
              }),
                $.push(L));
            }
          await Promise.all($.map((D) => D.finished.catch(() => {})));
        }

        handleHeadlineChange(e) {
          const t = e.target;
          this.hasHeadline = t.assignedElements().length > 0;
        }

        handleActionsChange(e) {
          const t = e.target;
          this.hasActions = t.assignedElements().length > 0;
        }

        handleIconChange(e) {
          const t = e.target;
          this.hasIcon = t.assignedElements().length > 0;
        }

        handleAnchorIntersection(e) {
          const { target: t, isIntersecting: r } = e;
          (t === this.topAnchor && (this.isAtScrollTop = r),
            t === this.bottomAnchor && (this.isAtScrollBottom = r));
        }

        getIsConnectedPromise() {
          return new Promise((e) => {
            this.isConnectedPromiseResolve = e;
          });
        }

        handleFocusTrapFocus(e) {
          const [t, r] = this.getFirstAndLastFocusableChildren();
          if (!t || !r) {
            this.dialog?.focus();
            return;
          }
          const i = e.target === this.firstFocusTrap;
          const n = !i;
          const s = e.relatedTarget === t;
          const l = e.relatedTarget === r;
          const c = !s && !l;
          if ((n && l) || (i && c)) {
            t.focus();
            return;
          }
          if ((i && s) || (n && c)) {
            r.focus();
          }
        }

        getFirstAndLastFocusableChildren() {
          if (!this.treewalker) return [null, null];
          let e = null;
          let t = null;
          for (
            this.treewalker.currentNode = this.treewalker.root;
            this.treewalker.nextNode();
          ) {
            const r = this.treewalker.currentNode;
            Sc(r) && (e || (e = r), (t = r));
          }
          return [e, t];
        }
      }));
    a([p({ type: Boolean })], U.prototype, "open", null);
    a([p({ type: Boolean })], U.prototype, "quick", void 0);
    a([p({ attribute: !1 })], U.prototype, "returnValue", void 0);
    a([p()], U.prototype, "type", void 0);
    a(
      [p({ type: Boolean, attribute: "no-focus-trap" })],
      U.prototype,
      "noFocusTrap",
      void 0,
    );
    a([S("dialog")], U.prototype, "dialog", void 0);
    a([S(".scrim")], U.prototype, "scrim", void 0);
    a([S(".container")], U.prototype, "container", void 0);
    a([S(".headline")], U.prototype, "headline", void 0);
    a([S(".content")], U.prototype, "content", void 0);
    a([S(".actions")], U.prototype, "actions", void 0);
    a([M()], U.prototype, "isAtScrollTop", void 0);
    a([M()], U.prototype, "isAtScrollBottom", void 0);
    a([S(".scroller")], U.prototype, "scroller", void 0);
    a([S(".top.anchor")], U.prototype, "topAnchor", void 0);
    a([S(".bottom.anchor")], U.prototype, "bottomAnchor", void 0);
    a([S(".focus-trap")], U.prototype, "firstFocusTrap", void 0);
    a([M()], U.prototype, "hasHeadline", void 0);
    a([M()], U.prototype, "hasActions", void 0);
    a([M()], U.prototype, "hasIcon", void 0);
  });
  let Ha;
  const qa = d(() => {
    y();
    Ha = x`:host{border-start-start-radius:var(--md-dialog-container-shape-start-start, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-start-end-radius:var(--md-dialog-container-shape-start-end, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-end-end-radius:var(--md-dialog-container-shape-end-end, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-end-start-radius:var(--md-dialog-container-shape-end-start, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));display:contents;margin:auto;max-height:min(560px,100% - 48px);max-width:min(560px,100% - 48px);min-height:140px;min-width:280px;position:fixed;height:fit-content;width:fit-content}dialog{background:rgba(0,0,0,0);border:none;border-radius:inherit;flex-direction:column;height:inherit;margin:inherit;max-height:inherit;max-width:inherit;min-height:inherit;min-width:inherit;outline:none;overflow:visible;padding:0;width:inherit}dialog[open]{display:flex}::backdrop{background:none}.scrim{background:var(--md-sys-color-scrim, #000);display:none;inset:0;opacity:32%;pointer-events:none;position:fixed;z-index:1}:host([open]) .scrim{display:flex}h2{all:unset;align-self:stretch}.headline{align-items:center;color:var(--md-dialog-headline-color, var(--md-sys-color-on-surface, #1d1b20));display:flex;flex-direction:column;font-family:var(--md-dialog-headline-font, var(--md-sys-typescale-headline-small-font, var(--md-ref-typeface-brand, Roboto)));font-size:var(--md-dialog-headline-size, var(--md-sys-typescale-headline-small-size, 1.5rem));line-height:var(--md-dialog-headline-line-height, var(--md-sys-typescale-headline-small-line-height, 2rem));font-weight:var(--md-dialog-headline-weight, var(--md-sys-typescale-headline-small-weight, var(--md-ref-typeface-weight-regular, 400)));position:relative}slot[name=headline]::slotted(*){align-items:center;align-self:stretch;box-sizing:border-box;display:flex;gap:8px;padding:24px 24px 0}.icon{display:flex}slot[name=icon]::slotted(*){color:var(--md-dialog-icon-color, var(--md-sys-color-secondary, #625b71));fill:currentColor;font-size:var(--md-dialog-icon-size, 24px);margin-top:24px;height:var(--md-dialog-icon-size, 24px);width:var(--md-dialog-icon-size, 24px)}.has-icon slot[name=headline]::slotted(*){justify-content:center;padding-top:16px}.scrollable slot[name=headline]::slotted(*){padding-bottom:16px}.scrollable.has-headline slot[name=content]::slotted(*){padding-top:8px}.container{border-radius:inherit;display:flex;flex-direction:column;flex-grow:1;overflow:hidden;position:relative;transform-origin:top}.container::before{background:var(--md-dialog-container-color, var(--md-sys-color-surface-container-high, #ece6f0));border-radius:inherit;content:"";inset:0;position:absolute}.scroller{display:flex;flex:1;flex-direction:column;overflow:hidden;z-index:1}.scrollable .scroller{overflow-y:scroll}.content{color:var(--md-dialog-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-dialog-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-dialog-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-dialog-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));flex:1;font-weight:var(--md-dialog-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)));height:min-content;position:relative}slot[name=content]::slotted(*){box-sizing:border-box;padding:24px}.anchor{position:absolute}.top.anchor{top:0}.bottom.anchor{bottom:0}.actions{position:relative}slot[name=actions]::slotted(*){box-sizing:border-box;display:flex;gap:8px;justify-content:flex-end;padding:16px 24px 24px}.has-actions slot[name=content]::slotted(*){padding-bottom:8px}md-divider{display:none;position:absolute}.has-headline.show-top-divider .headline md-divider,.has-actions.show-bottom-divider .actions md-divider{display:flex}.headline md-divider{bottom:0}.actions md-divider{top:0}@media(forced-colors: active){dialog{outline:2px solid WindowText}}
`;
  });
  let Ti;
  const Va = d(() => {
    T();
    I();
    Ua();
    qa();
    Ti = class extends U {};
    Ti.styles = [Ha];
    Ti = a([C("md-dialog")], Ti);
  });
  const Wa = nn(() => {
    as();
    ps();
    fs();
    bs();
    $s();
    Qs();
    va();
    Ca();
    $a();
    ka();
    Va();
  });
  let Xo;
  let Wt;
  let Zo;
  let ja;
  let Jo;
  const Ka = d(() => {
    ((Xo = "chat_history"),
      (Wt = async () => (await chrome.storage.local.get(Xo))[Xo] || []),
      (Zo = async (o, e, t) => {
        if (!e.length) return;
        const r = await Wt();
        const i = r.findIndex((s) => s.id === o);
        const n = { id: o, messages: e, updatedAt: t };
        (i >= 0 ? (r[i] = n) : r.unshift(n),
          r.length > 50 && (r.length = 50),
          await chrome.storage.local.set({ [Xo]: r }));
      }),
      (ja = async (o) => {
        const t = (await Wt()).find((r) => r.id === o);
        if (!t) throw new Error("\u5BF9\u8BDD\u8BB0\u5F55\u4E0D\u5B58\u5728");
        return t;
      }),
      (Jo = async (o) => {
        const t = (await Wt()).filter((r) => r.id !== o);
        await chrome.storage.local.set({ [Xo]: t });
      }));
  });
  let $c;
  let Be;
  const Ga = d(() => {
    (($c = (o) =>
      globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${o ? `${o}_` : ""}${Date.now()}_${Math.random().toString(16).slice(2)}`),
      (Be = $c));
  });
  let Rc;
  let jt;
  const Ya = d(() => {
    ((Rc = (o) => {
      if (typeof o !== "string")
        throw new Error(
          "JSON \u8F93\u5165\u5FC5\u987B\u662F\u5B57\u7B26\u4E32",
        );
      try {
        return JSON.parse(o);
      } catch (e) {
        throw new Error(`JSON \u89E3\u6790\u5931\u8D25\uFF1A${e.message}`);
      }
    }),
      (jt = Rc));
  });
  let Oc;
  let he;
  const Xa = d(() => {
    ((Oc = (o) => (o === "light" || o === "dark" || o === "auto" ? o : "auto")),
      (he = Oc));
  });
  let Pc;
  let kc;
  let Qo;
  let Je;
  const Za = d(() => {
    ((Pc = (o) => (o || "").trim().toLowerCase()),
      (kc = (o) =>
        Array.from(o).reduce((e, t) => {
          const r = t.codePointAt(0);
          return r <= 31 || r === 127 || t.trim() === "" ? e : `${e}${t}`;
        }, "")),
      (Qo = (o) => kc(Pc(o))),
      (Je = (o) => {
        const e = Qo(o);
        return (
          e.startsWith("chrome://") ||
          e.startsWith("edge://") ||
          e.startsWith("https://chromewebstore.google.com") ||
          e.startsWith("http://chromewebstore.google.com") ||
          e.startsWith("https://microsoftedge.microsoft.com") ||
          e.startsWith("http://microsoftedge.microsoft.com")
        );
      }));
  });
  const ae = d(() => {
    Ga();
    Ya();
    Xa();
    Za();
  });
  let Ja;
  let Lc;
  let Mc;
  let Qa;
  let Kt;
  let Gt;
  let Dc;
  let zc;
  let Bc;
  let Ii;
  const el = d(() => {
    ae();
    ((Ja = "llm-sandbox-frame"),
      (Lc = "runConsoleResult"),
      (Mc = "runConsoleCommand"),
      (Qa = 5e3),
      (Kt = null),
      (Gt = null),
      (Dc = () => {
        if (!document?.body)
          throw new Error(
            "\u9762\u677F\u5C1A\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u521B\u5EFA sandbox",
          );
        const o = document.getElementById(Ja);
        if (o) return o;
        const e = document.createElement("iframe");
        return (
          (e.id = Ja),
          (e.src = chrome.runtime.getURL("public/sandbox.html")),
          (e.style.display = "none"),
          document.body.appendChild(e),
          e
        );
      }),
      (zc = async () =>
        Gt ||
        (Kt ||
          (Kt = new Promise((o, e) => {
            const t = Dc();
            const r = setTimeout(() => {
              ((Kt = null),
                e(
                  new Error(
                    `sandbox \u9875\u9762\u52A0\u8F7D\u8D85\u65F6\uFF08${Qa}ms\uFF09`,
                  ),
                ));
            }, Qa);
            const i = () => {
              if ((clearTimeout(r), (Kt = null), (Gt = t.contentWindow), !Gt)) {
                e(new Error("\u65E0\u6CD5\u83B7\u53D6 sandbox \u7A97\u53E3"));
                return;
              }
              o(Gt);
            };
            t.addEventListener("load", i, { once: !0 });
          })),
        Kt)),
      (Bc = async (o, e = 5e3) => {
        const t = await zc();
        if (!t) throw new Error("sandbox \u7A97\u53E3\u4E0D\u53EF\u7528");
        const r = Be("sandbox");
        return new Promise((i, n) => {
          let s = null;
          const l = (c) => {
            if (c.source !== t) return;
            const { data: m } = c;
            if (!(!m || m.type !== Lc) && m.requestId === r) {
              if (
                (clearTimeout(s),
                window.removeEventListener("message", l),
                m.error)
              ) {
                n(new Error(m.error));
                return;
              }
              i(m);
            }
          };
          ((s = setTimeout(() => {
            (window.removeEventListener("message", l),
              n(
                new Error(
                  `\u7B49\u5F85 sandbox \u54CD\u5E94\u8D85\u65F6\uFF08${e}ms\uFF09`,
                ),
              ));
          }, e)),
            window.addEventListener("message", l),
            t.postMessage({ ...o, requestId: r, type: Mc }, "*"));
        });
      }),
      (Ii = Bc));
  });
  let me;
  let Nc;
  let Ne;
  let Fc;
  let Si;
  let tl;
  const ol = d(() => {
    ae();
    ((me = {
      apiKey: "openai_api_key",
      baseUrl: "openai_base_url",
      model: "openai_model",
      apiType: "openai_api_type",
      theme: "openai_theme",
    }),
      (Nc = (o) => ({
        apiKey: o?.[me.apiKey] || "",
        baseUrl: o?.[me.baseUrl] || "",
        model: o?.[me.model] || "",
        apiType: o?.[me.apiType] || "chat",
        theme: he(o?.[me.theme] || "auto"),
      })),
      (Ne = () =>
        new Promise((o) => {
          chrome.storage.local.get(Object.values(me), (e) => {
            o(Nc(e || {}));
          });
        })),
      (Fc = (o) =>
        new Promise((e) => {
          chrome.storage.local.set(
            {
              [me.apiKey]: o.apiKey,
              [me.baseUrl]: o.baseUrl,
              [me.model]: o.model,
              [me.apiType]: o.apiType,
              [me.theme]: he(o.theme),
            },
            e,
          );
        })),
      (Si = async (o) => {
        const e = await Ne();
        const t = { ...e, ...o, theme: he(o.theme ?? e.theme) };
        return (await Fc(t), t);
      }),
      (tl = (o, e) => {
        const t = o.replace(/\/+$/, "");
        const r = "/chat/completions";
        const i = "/responses";
        return t.endsWith(r)
          ? e === "responses"
            ? `${t.slice(0, -r.length)}${i}`
            : t
          : t.endsWith(i)
            ? e === "chat"
              ? `${t.slice(0, -i.length)}${r}`
              : t
            : `${t}${e === "responses" ? i : r}`;
      }));
  });
  let g;
  let Uc;
  let Hc;
  let $i;
  let de;
  let er;
  let tr;
  let or;
  let Ri;
  let rl;
  const il = d(() => {
    ae();
    ((g = {
      conversationId: Be("conv"),
      messages: [],
      sending: !1,
      systemPrompt: null,
      updatedAt: Date.now(),
    }),
      (Uc = (o) => typeof o === "string" && !!o.trim()),
      (Hc = (o) =>
        o?.role === "tool" || (o?.role === "assistant" && !Uc(o.content))),
      ($i = (o) => {
        if (!o || typeof o !== "object")
          throw new Error("\u6D88\u606F\u683C\u5F0F\u65E0\u6548");
        const e = { ...o };
        return ((e.hidden = Hc(e)), e);
      }),
      (de = (o) => {
        const e = $i(o);
        return (g.messages.push(e), e);
      }),
      (er = (o, e) => {
        if (!Number.isInteger(o) || o < 0 || o >= g.messages.length)
          throw new Error("\u6D88\u606F\u7D22\u5F15\u65E0\u6548");
        const t = g.messages[o];
        const r = typeof e === "function" ? e({ ...t }) : { ...t, ...e };
        const i = $i(r);
        return ((g.messages[o] = i), i);
      }),
      (tr = (o) => {
        if (!Number.isInteger(o) || o < 0 || o >= g.messages.length)
          throw new Error("\u6D88\u606F\u7D22\u5F15\u65E0\u6548");
        return g.messages.splice(o, 1)[0];
      }),
      (or = () => {
        g.updatedAt = Date.now();
      }),
      (Ri = () => {
        ((g.conversationId = Be("conv")),
          (g.messages = []),
          (g.updatedAt = Date.now()));
      }),
      (rl = (o, e, t) => {
        ((g.conversationId = o),
          (g.messages = e.map((r) => $i(r))),
          (g.updatedAt = t));
      }));
  });
  const Ie = d(() => {
    il();
  });
  let qc;
  let Vc;
  let Oi;
  const nl = d(() => {
    Ie();
    ((qc = async () => {
      if (g.systemPrompt !== null) return g.systemPrompt;
      const o = await fetch(chrome.runtime.getURL("public/system_prompt.md"));
      if (!o.ok)
        throw new Error(
          `\u7CFB\u7EDF\u63D0\u793A\u52A0\u8F7D\u5931\u8D25\uFF1A${o.status}`,
        );
      return ((g.systemPrompt = (await o.text()) || ""), g.systemPrompt);
    }),
      (Vc = async () => {
        const o = await qc();
        return o ? o.trim() : "";
      }),
      (Oi = Vc));
  });
  let Wc;
  let rr;
  let Yt;
  let sl;
  let al;
  let Xt;
  let ir;
  const ll = d(() => {
    ((Wc = (o) =>
      new Promise((e) => {
        setTimeout(e, o);
      })),
      (rr = () =>
        new Promise((o, e) => {
          chrome.tabs.query({ active: !0, lastFocusedWindow: !0 }, (t) => {
            if (chrome.runtime.lastError) {
              const i =
                chrome.runtime.lastError.message ||
                "\u65E0\u6CD5\u67E5\u8BE2\u6D3B\u52A8\u6807\u7B7E\u9875";
              e(new Error(i));
              return;
            }
            const r = t?.[0];
            if (!r) {
              e(new Error("\u672A\u627E\u5230\u6D3B\u52A8\u6807\u7B7E\u9875"));
              return;
            }
            o(r);
          });
        })),
      (Yt = () =>
        new Promise((o, e) => {
          chrome.tabs.query({}, (t) => {
            if (chrome.runtime.lastError) {
              const r =
                chrome.runtime.lastError.message ||
                "\u65E0\u6CD5\u67E5\u8BE2\u6240\u6709\u6807\u7B7E\u9875";
              e(new Error(r));
              return;
            }
            o(t);
          });
        })),
      (sl = (o, e) =>
        new Promise((t, r) => {
          chrome.tabs.create({ url: o, active: e }, (i) => {
            if (chrome.runtime.lastError) {
              const n =
                chrome.runtime.lastError.message ||
                "\u65E0\u6CD5\u521B\u5EFA\u6807\u7B7E\u9875";
              r(new Error(n));
              return;
            }
            if (!i) {
              r(new Error("\u521B\u5EFA\u6807\u7B7E\u9875\u5931\u8D25"));
              return;
            }
            if (typeof i.id !== "number") {
              r(
                new Error(
                  "\u521B\u5EFA\u6807\u7B7E\u9875\u5931\u8D25\uFF1A\u7F3A\u5C11 tab.id",
                ),
              );
              return;
            }
            t(i);
          });
        })),
      (al = (o) =>
        new Promise((e, t) => {
          chrome.tabs.remove(o, () => {
            if (chrome.runtime.lastError) {
              const r =
                chrome.runtime.lastError.message ||
                "\u65E0\u6CD5\u5173\u95ED\u6807\u7B7E\u9875";
              t(new Error(r));
              return;
            }
            e();
          });
        })),
      (Xt = (o, e) =>
        new Promise((t, r) => {
          chrome.tabs.sendMessage(o, e, (i) => {
            if (chrome.runtime.lastError) {
              const n =
                chrome.runtime.lastError.message ||
                "\u65E0\u6CD5\u53D1\u9001\u6D88\u606F\u5230\u9875\u9762";
              r(new Error(n));
              return;
            }
            if (!i) {
              r(new Error("\u9875\u9762\u672A\u8FD4\u56DE\u7ED3\u679C"));
              return;
            }
            if (i.error) {
              r(new Error(i.error));
              return;
            }
            t(i);
          });
        })),
      (ir = async (o, e = 1e4) => {
        if (typeof o !== "number")
          throw new Error("TabID \u5FC5\u987B\u662F\u6570\u5B57");
        const t = Date.now();
        let r = null;
        const i = async () => {
          if (Date.now() - t >= e) {
            const n = r?.message
              ? `\uFF0C\u6700\u540E\u9519\u8BEF\uFF1A${r.message}`
              : "";
            throw new Error(
              `\u7B49\u5F85\u9875\u9762\u5185\u5BB9\u811A\u672C\u5C31\u7EEA\u8D85\u65F6\uFF08${e}ms${n}\uFF09`,
            );
          }
          try {
            if ((await Xt(o, { type: "ping" }))?.ok) return;
            throw new Error(
              "\u9875\u9762\u672A\u8FD4\u56DE\u5C31\u7EEA\u4FE1\u53F7",
            );
          } catch (n) {
            ((r = n), await Wc(1e3), await i());
          }
        };
        await i();
      }));
  });
  const Se = d(() => {
    Ka();
    el();
    ol();
    nl();
    ll();
  });
  let jc;
  let Pi;
  let ki;
  let nr;
  let sr;
  let ar;
  let lr;
  let Qe;
  let et;
  let dl;
  let cl;
  let pl;
  let Fe;
  let tt;
  let dr;
  let $e;
  let cr;
  let q;
  let ul;
  let hl;
  let bt;
  let pr;
  let Zt;
  let ml;
  const xt = d(() => {
    ((jc = (o) => document.getElementById(o)),
      ([
        Pi,
        ki,
        nr,
        sr,
        ar,
        lr,
        Qe,
        et,
        dl,
        cl,
        pl,
        Fe,
        tt,
        dr,
        $e,
        cr,
        q,
        ul,
        hl,
        bt,
        pr,
        Zt,
        ml,
      ] = [
        "key-view",
        "chat-view",
        "api-key-input",
        "base-url-input",
        "model-input",
        "api-type-select",
        "theme-select",
        "key-status",
        "open-settings",
        "save-key",
        "cancel-settings",
        "messages",
        "prompt",
        "send",
        "send-with-page",
        "stop",
        "status",
        "new-chat",
        "history",
        "history-panel",
        "history-list",
        "confirm-dialog",
        "confirm-message",
      ].map(jc)));
  });
  let fl;
  let Kc;
  let Ue;
  const vl = d(() => {
    xt();
    ae();
    ((fl = (o, e) => {
      o.select(e);
    }),
      (Kc = (o) => {
        ((nr.value = o.apiKey || ""),
          (sr.value = o.baseUrl || ""),
          (ar.value = o.model || ""),
          fl(lr, o.apiType || "chat"),
          fl(Qe, he(o.theme)));
      }),
      (Ue = Kc));
  });
  let gl;
  let yl;
  let bl;
  const ur = d(() => {
    ae();
    ((gl = (o) => {
      const e = Qo(o);
      return e
        ? e.startsWith("#") || !e.match(/^[a-z0-9+.-]+:/)
          ? !0
          : e.startsWith("http:") ||
            e.startsWith("https:") ||
            e.startsWith("mailto:")
        : !1;
    }),
      (yl = (o) => Qo(o).startsWith("data:")),
      (bl = (o) => {
        const e = document.createElement("template");
        return (
          (e.innerHTML = o || ""),
          e.content.querySelectorAll("*").forEach((r) => {
            Array.from(r.attributes).forEach((i) => {
              i.name.toLowerCase().startsWith("on") &&
                r.removeAttribute(i.name);
            });
          }),
          e.content.querySelectorAll("a[href]").forEach((r) => {
            const i = r.getAttribute("href");
            (gl(i) || r.removeAttribute("href"),
              r.setAttribute("rel", "noopener noreferrer"),
              r.setAttribute("target", "_blank"));
          }),
          e.content.querySelectorAll("img[src]").forEach((r) => {
            const i = r.getAttribute("src");
            gl(i) || r.removeAttribute("src");
          }),
          e.innerHTML
        );
      }));
  });
  let xl;
  let _t;
  let Li;
  const _l = d(() => {
    ur();
    xl = window?.TurndownService;
    if (typeof xl !== "function")
      throw new Error(
        "TurndownService \u672A\u52A0\u8F7D\uFF0C\u65E0\u6CD5\u8F6C\u6362\u9875\u9762\u5185\u5BB9",
      );
    _t = new xl({ codeBlockStyle: "fenced" });
    _t.remove(["script", "style"]);
    _t.addRule("image", {
      filter: "img",
      replacement: (o, e) => {
        if (!e || e.nodeName !== "IMG") return "";
        const t = e.getAttribute("src") || "";
        const r = e.getAttribute("alt") || "";
        if (!t || yl(t)) return _t.escape(r);
        const i = e.getAttribute("title");
        const n = i ? ` "${_t.escape(i)}"` : "";
        return `![${_t.escape(r)}](${t}${n})`;
      },
    });
    Li = (o) => {
      if (!o || typeof o.html !== "string")
        throw new Error("\u9875\u9762\u5185\u5BB9\u4E3A\u7A7A");
      if (!o.html.trim())
        throw new Error("\u9875\u9762\u5185\u5BB9\u4E3A\u7A7A");
      if (typeof DOMParser !== "function")
        throw new Error(
          "DOMParser \u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u89E3\u6790\u9875\u9762 HTML",
        );
      const t = new DOMParser().parseFromString(o.html, "text/html");
      if (!t?.body)
        throw new Error("\u89E3\u6790\u9875\u9762 HTML \u5931\u8D25");
      const r = (w) => (w || "").trim();
      const i = (w) =>
        w
          .map((z) => {
            const X = t.getElementById(z);
            if (!X)
              throw new Error(
                `aria-labelledby \u6307\u5411\u4E0D\u5B58\u5728\u7684\u6309\u94AE: ${z}`,
              );
            return r(X.textContent);
          })
          .filter(Boolean)
          .join(" ")
          .trim() || "";
      const n = (w) => {
        const L = w.tagName === "INPUT" ? w.value : w.textContent;
        const H = r(L);
        if (H) return H;
        const z = r(w.getAttribute("aria-label"));
        if (z) return z;
        const X = r(w.getAttribute("aria-labelledby"));
        if (X) {
          const ie = X.split(/\s+/).filter(Boolean);
          if (!ie.length)
            throw new Error(
              "aria-labelledby \u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u89E3\u6790\u6309\u94AE\u540D\u79F0",
            );
          const Ct = i(ie);
          if (Ct) return Ct;
        }
        const ce = r(w.getAttribute("title"));
        if (ce) return ce;
        const fe = r(w.querySelector("img")?.getAttribute("alt"));
        if (fe) return fe;
        const qe = r(w.querySelector("svg title")?.textContent);
        if (qe) return qe;
        const be = r(w.querySelector("svg")?.getAttribute("aria-label"));
        return be || "\u672A\u547D\u540D\u6309\u94AE";
      };
      t.body.querySelectorAll("[data-llm-id]").forEach((w) => {
        const L = w;
        const H = r(L.getAttribute("data-llm-id"));
        if (!H) throw new Error("\u6309\u94AE\u7F3A\u5C11 data-llm-id");
        const X = `[button: "${n(L)}", id: "${H}"]`;
        ((L.textContent = X),
          L.tagName === "INPUT" && ((L.value = X), L.setAttribute("value", X)));
      });
      const l = "LLMVIEWPORTCENTERMARKER";
      const c = t.body.querySelector("[data-llm-viewport-center]");
      if (!c)
        throw new Error(
          "\u672A\u627E\u5230\u89C6\u53E3\u4E2D\u5FC3\u6807\u8BB0\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u622A\u53D6\u8303\u56F4",
        );
      c.textContent = l;
      const m = t.body.innerHTML;
      const f = _t.turndown(m);
      const h = f.indexOf(l);
      if (h < 0)
        throw new Error(
          "\u89C6\u53E3\u4E2D\u5FC3\u6807\u8BB0\u4E22\u5931\uFF0C\u65E0\u6CD5\u5B9A\u4F4D\u622A\u53D6\u8303\u56F4",
        );
      const b = 2e4;
      const _ = Math.max(0, h - b);
      const P = Math.min(f.length, h + l.length + b);
      const $ = _ > 0;
      const D = P < f.length;
      let k = f.slice(_, P);
      return (
        (k = k.replace(l, "")),
        $ &&
          (k = `[[TRUNCATED_START]]
${k}`),
        D &&
          (k = `${k}
[[TRUNCATED_END]]`),
        { title: o.title || "", url: o.url || "", content: k }
      );
    };
  });
  let Gc;
  let Yc;
  let hr;
  const wl = d(() => {
    ur();
    ((Gc = window.markdownit({ html: !1, linkify: !0, breaks: !0 })),
      (Yc = (o) => bl(Gc.render(o || ""))),
      (hr = Yc));
  });
  const Mi = d(() => {
    _l();
    wl();
    ur();
  });
  let Di;
  let El;
  let Al;
  let Xc;
  let Zc;
  let zi;
  let Cl;
  const Tl = d(() => {
    xt();
    Mi();
    ((Di = (o, e) => {
      if (typeof o !== "function")
        throw new Error(
          `\u6D88\u606F\u64CD\u4F5C\u5904\u7406\u5668\u7F3A\u5931\uFF1A${e}`,
        );
      return o;
    }),
      (El = async (o, e, t) => {
        try {
          await o(e);
        } catch (r) {
          t(r);
        }
      }),
      (Al = ({ label: o, className: e, title: t, onClick: r }) => {
        const i = document.createElement("button");
        return (
          (i.type = "button"),
          (i.className = e),
          (i.textContent = o),
          (i.title = t),
          i.addEventListener("click", async (n) => {
            (n.stopPropagation(), await r());
          }),
          i
        );
      }),
      (Xc = (o, e) => {
        const t = Di(e?.onCopy, "\u590D\u5236");
        const r = Di(e?.onDelete, "\u5220\u9664");
        const i = Di(e?.onError, "\u9519\u8BEF\u5904\u7406");
        const n = document.createElement("div");
        n.className = "message-actions";
        const s = Al({
          label: "\u590D\u5236",
          className: "message-action message-copy",
          title: "\u590D\u5236",
          onClick: () => El(t, o, i),
        });
        const l = Al({
          label: "\u5220\u9664",
          className: "message-action message-delete",
          title: "\u5220\u9664",
          onClick: () => El(r, o, i),
        });
        return (n.append(s, l), n);
      }),
      (Zc = (o) => {
        const e = document.createElement("div");
        return ((e.className = "message-content"), (e.innerHTML = hr(o)), e);
      }),
      (zi = (o, e) => {
        if (!Array.isArray(o))
          throw new Error("messages \u5FC5\u987B\u662F\u6570\u7EC4");
        if (!e || typeof e !== "object")
          throw new Error(
            "\u6D88\u606F\u64CD\u4F5C\u5904\u7406\u5668\u7F3A\u5931",
          );
        ((Fe.innerHTML = ""),
          o.forEach((t, r) => {
            if (t.hidden) return;
            const i = document.createElement("div");
            ((i.className = `message ${t.role}`),
              i.appendChild(Zc(t.content)),
              i.appendChild(Xc(r, e)),
              Fe.appendChild(i));
          }),
          (Fe.scrollTop = Fe.scrollHeight));
      }),
      (Cl = (o) => {
        const e = Fe.lastElementChild;
        if (!e || !e.classList.contains("assistant")) return !1;
        const t = e.querySelector(".message-content");
        return t
          ? ((t.innerHTML = hr(o)), (Fe.scrollTop = Fe.scrollHeight), !0)
          : !1;
      }));
  });
  let Jc;
  let B;
  const Bi = d(() => {
    ((Jc = (o, e) => {
      const t = o;
      t.textContent = e || "";
    }),
      (B = Jc));
  });
  let He;
  let wt;
  let Qc;
  let ep;
  let tp;
  let ot;
  const Il = d(() => {
    ae();
    ((He = null),
      (wt = null),
      (Qc = () => {
        if (!He || !wt) {
          ((He = null), (wt = null));
          return;
        }
        if (typeof He.removeEventListener === "function")
          He.removeEventListener("change", wt);
        else if (typeof He.removeListener === "function") He.removeListener(wt);
        else
          throw new Error(
            "\u65E0\u6CD5\u79FB\u9664\u7CFB\u7EDF\u4E3B\u9898\u76D1\u542C",
          );
        ((He = null), (wt = null));
      }),
      (ep = () => {
        if (typeof window.matchMedia !== "function")
          throw new Error(
            "matchMedia \u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u5E94\u7528\u81EA\u52A8\u4E3B\u9898",
          );
        const o = window.matchMedia("(prefers-color-scheme: dark)");
        const e = () => {
          document.documentElement.setAttribute(
            "data-theme",
            o.matches ? "dark" : "light",
          );
        };
        if ((e(), typeof o.addEventListener === "function"))
          o.addEventListener("change", e);
        else if (typeof o.addListener === "function") o.addListener(e);
        else
          throw new Error(
            "\u65E0\u6CD5\u76D1\u542C\u7CFB\u7EDF\u4E3B\u9898\u53D8\u5316",
          );
        ((He = o), (wt = e));
      }),
      (tp = (o) => {
        const e = he(o);
        return (
          Qc(),
          e === "auto"
            ? (ep(), e)
            : (document.documentElement.setAttribute("data-theme", e), e)
        );
      }),
      (ot = tp));
  });
  let Et;
  let Jt;
  const Sl = d(() => {
    xt();
    Bi();
    ((Et = () => {
      (Pi.classList.remove("hidden"), ki.classList.add("hidden"), B(et, ""));
    }),
      (Jt = () => {
        (Pi.classList.add("hidden"),
          ki.classList.remove("hidden"),
          B(q, ""),
          tt.focus());
      }));
  });
  let op;
  let Ni;
  const $l = d(() => {
    xt();
    ((op = (o) =>
      new Promise((e) => {
        ((ml.textContent = o), Zt.show());
        const t = () => {
          (Zt.removeEventListener("close", t), e(Zt.returnValue === "confirm"));
        };
        Zt.addEventListener("close", t);
      })),
      (Ni = op));
  });
  const ye = d(() => {
    xt();
    vl();
    Tl();
    Bi();
    Il();
    Sl();
    $l();
  });
  let Rl;
  let rp;
  let Ol;
  let At;
  const mr = d(() => {
    ye();
    Se();
    ae();
    ((Rl = (o) => {
      (($e.disabled = !0),
        ($e.title =
          o ||
          "\u5F53\u524D\u6807\u7B7E\u9875\u4E0D\u652F\u6301\u643A\u9875\u9762\u53D1\u9001"));
    }),
      (rp = () => {
        (($e.disabled = !1), ($e.title = ""));
      }),
      (Ol = async () => {
        const o = await rr();
        if (!o.url)
          throw new Error("\u6D3B\u52A8\u6807\u7B7E\u9875\u7F3A\u5C11 URL");
        if (Je(o.url)) {
          Rl(
            "\u5185\u90E8\u9875\u9762\u4E0D\u652F\u6301\u643A\u9875\u9762\u53D1\u9001",
          );
          return;
        }
        rp();
      }),
      (At = async () => {
        try {
          await Ol();
        } catch (o) {
          const e =
            o?.message ||
            "\u65E0\u6CD5\u8BFB\u53D6\u6D3B\u52A8\u6807\u7B7E\u9875";
          (Rl(e), B(q, e));
        }
      }));
  });
  let Pl;
  let kl;
  let Ll;
  let Ml;
  const Fi = d(() => {
    ye();
    ae();
    Se();
    ((Pl = async () => {
      const o = nr.value.trim();
      const e = sr.value.trim();
      const t = ar.value.trim();
      const r = lr.value;
      if (!o || !e || !t) {
        B(
          et,
          "API Key\u3001Base URL \u548C\u6A21\u578B\u4E0D\u80FD\u4E3A\u7A7A",
        );
        return;
      }
      const i = await Si({
        apiKey: o,
        baseUrl: e,
        model: t,
        apiType: r,
        theme: he(Qe.value),
      });
      (ot(i.theme), Jt());
    }),
      (kl = async () => {
        const o = await Ne();
        (Ue(o),
          B(et, ""),
          ot(o.theme),
          o.apiKey && o.baseUrl && o.model && Jt());
      }),
      (Ll = async () => {
        const o = await Ne();
        (Et(), Ue(o));
      }),
      (Ml = async () => {
        const o = ot(Qe.value);
        await Si({ theme: o });
      }));
  });
  let V;
  let Dl;
  let ip;
  let np;
  let sp;
  let ap;
  let lp;
  let dp;
  let cp;
  let pp;
  let zl;
  let fr;
  let Qt;
  let eo;
  let to;
  let Bl;
  let vr;
  let Nl;
  let Fl;
  let Ul;
  let Hl;
  let ql;
  const gr = d(() => {
    ae();
    ((V = {
      openBrowserPage: "open_page",
      clickButton: "click_button",
      getPageMarkdown: "get_page",
      closeBrowserPage: "close_page",
      runConsoleCommand: "run_console",
      listTabs: "list_tabs",
    }),
      (Dl = !0),
      (ip = {
        type: "object",
        properties: {
          url: { type: "string" },
          focus: {
            type: "boolean",
            description:
              "\u662F\u5426\u5207\u6362\u6D4F\u89C8\u5668\u7126\u70B9\u5230\u65B0\u9875\u9762",
          },
        },
        required: ["url", "focus"],
        additionalProperties: !1,
      }),
      (np = {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "\u8981\u70B9\u51FB\u7684 button \u7684 ID",
          },
        },
        required: ["id"],
        additionalProperties: !1,
      }),
      (sp = {
        type: "object",
        properties: { tabId: { type: "number" } },
        required: ["tabId"],
        additionalProperties: !1,
      }),
      (ap = {
        type: "object",
        properties: { tabId: { type: "number" } },
        required: ["tabId"],
        additionalProperties: !1,
      }),
      (lp = {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
        additionalProperties: !1,
      }),
      (dp = { type: "object", properties: {}, additionalProperties: !1 }),
      (cp = [
        {
          name: V.openBrowserPage,
          description:
            "\u5728\u5F53\u524D\u6D4F\u89C8\u5668\u6253\u5F00\u6307\u5B9A\u7F51\u9875",
          parameters: ip,
        },
        {
          name: V.clickButton,
          description:
            "\u70B9\u51FB\u5F53\u524D\u9875\u9762\u4E0A\u6307\u5B9A\u7684 button",
          parameters: np,
        },
        {
          name: V.getPageMarkdown,
          description: "\u8BFB\u53D6\u9875\u9762\u5185\u5BB9",
          parameters: sp,
        },
        {
          name: V.closeBrowserPage,
          description: "\u5173\u95ED\u6807\u7B7E\u9875",
          parameters: ap,
        },
        {
          name: V.runConsoleCommand,
          description:
            "\u5728 Sandbox Page \u4E2D\u6267\u884C\u63A7\u5236\u53F0\u547D\u4EE4\u5E76\u83B7\u53D6\u7ED3\u679C",
          parameters: lp,
        },
        {
          name: V.listTabs,
          description:
            "\u5217\u51FA\u6240\u6709\u5F53\u524D\u5DF2\u6253\u5F00\u7684\u6807\u7B7E\u9875\u7684\u6807\u9898\u3001URL \u548C TabID",
          parameters: dp,
        },
      ]),
      (pp = (o, e) => {
        const { description: t } = o;
        if (!t)
          throw new Error(`\u5DE5\u5177 ${o.name} \u7F3A\u5C11 description`);
        return e
          ? {
              type: "function",
              name: o.name,
              description: t,
              parameters: o.parameters,
              strict: Dl,
            }
          : {
              type: "function",
              function: {
                name: o.name,
                description: t,
                parameters: o.parameters,
                strict: Dl,
              },
            };
      }),
      (zl = (o) => {
        const e = o === "responses";
        return cp.map((t) => pp(t, e));
      }),
      (fr = (o) => jt(o)),
      (Qt = (o) => o?.function?.arguments ?? o?.arguments ?? ""),
      (eo = (o) => {
        const e = o?.call_id || o?.id;
        if (!e) throw new Error("\u5DE5\u5177\u8C03\u7528\u7F3A\u5C11 call_id");
        return e;
      }),
      (to = (o) => {
        const e = o?.function?.name || o?.name;
        if (!e) throw new Error("\u5DE5\u5177\u8C03\u7528\u7F3A\u5C11 name");
        return e;
      }),
      (Bl = (o) => {
        if (!o || typeof o !== "object")
          throw new Error(
            "\u5DE5\u5177\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61",
          );
        const e = o.tabId;
        if (typeof e === "number" && Number.isInteger(e) && e > 0)
          return { tabId: e };
        if (typeof e === "string" && e.trim()) {
          const t = Number(e);
          if (!Number.isInteger(t) || t <= 0)
            throw new Error("tabId \u5FC5\u987B\u662F\u6B63\u6574\u6570");
          return { tabId: t };
        }
        throw new Error("tabId \u5FC5\u987B\u662F\u6B63\u6574\u6570");
      }),
      (vr = (o) => Bl(o)),
      (Nl = (o) => Bl(o)),
      (Fl = (o) => {
        if (!o || typeof o !== "object")
          throw new Error(
            "\u5DE5\u5177\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61",
          );
        if (typeof o.command !== "string" || !o.command.trim())
          throw new Error(
            "command \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32",
          );
        return { command: o.command.trim() };
      }),
      (Ul = (o) => {
        if (!o || typeof o !== "object")
          throw new Error(
            "\u5DE5\u5177\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61",
          );
        if (typeof o.url !== "string" || !o.url.trim())
          throw new Error(
            "url \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32",
          );
        if (typeof o.focus !== "boolean")
          throw new Error("focus \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
        let e;
        try {
          e = new URL(o.url);
        } catch {
          throw new Error("url \u683C\u5F0F\u4E0D\u6B63\u786E");
        }
        if (e.protocol !== "http:" && e.protocol !== "https:")
          throw new Error("url \u4EC5\u652F\u6301 http \u6216 https");
        return { url: e.toString(), focus: o.focus };
      }),
      (Hl = (o) => {
        if (!o || typeof o !== "object")
          throw new Error(
            "\u5DE5\u5177\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61",
          );
        if (typeof o.id !== "string" || !o.id.trim())
          throw new Error(
            "id \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32",
          );
        return { id: o.id.trim() };
      }),
      (ql = (o) => {
        if (!o || typeof o !== "object")
          throw new Error(
            "\u5DE5\u5177\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61",
          );
        return {};
      }));
  });
  let up;
  let hp;
  let mp;
  let fp;
  let vp;
  let gp;
  let Vl;
  let Wl;
  let jl;
  let Kl;
  const Gl = d(() => {
    Ie();
    gr();
    ((up = (o) => ({
      id: o.callId,
      type: "function",
      function: { name: o.name, arguments: o.arguments },
    })),
      (hp = (o) => {
        const e = Qt(o);
        let t;
        try {
          t = fr(e || "{}");
        } catch (i) {
          const n = i?.message || "\u672A\u77E5\u9519\u8BEF";
          throw new Error(
            `get_page \u5DE5\u5177\u53C2\u6570\u89E3\u6790\u5931\u8D25\uFF1A${n}`,
          );
        }
        const { tabId: r } = vr(t);
        return r;
      }),
      (mp = (o) => {
        if (typeof o !== "string")
          throw new Error(
            "open_page \u5DE5\u5177\u54CD\u5E94\u5FC5\u987B\u662F\u5B57\u7B26\u4E32",
          );
        const e = o.trim();
        if (!e)
          throw new Error(
            "open_page \u5DE5\u5177\u54CD\u5E94\u4E0D\u80FD\u4E3A\u7A7A",
          );
        if (!e.startsWith("**\u6210\u529F**") || e === "**\u6210\u529F**")
          return null;
        const t = e.match(/TabID:\s*["'“”]?(\d+)["'“”]?/);
        if (!t)
          throw new Error(
            "open_page \u6210\u529F\u54CD\u5E94\u7F3A\u5C11 TabID",
          );
        const r = Number(t[1]);
        if (!Number.isInteger(r) || r <= 0)
          throw new Error("open_page \u54CD\u5E94 TabID \u65E0\u6548");
        return r;
      }),
      (fp = (o) =>
        typeof o === "string" && o.trim().startsWith("**\u6807\u9898\uFF1A**")),
      (vp = (o) => {
        const e = new Map();
        o.forEach((s) => {
          Array.isArray(s.tool_calls) &&
            s.tool_calls.forEach((l) => {
              const c = eo(l);
              const m = to(l);
              if (e.has(c)) {
                if (e.get(c)?.name !== m)
                  throw new Error(
                    `\u91CD\u590D\u7684\u5DE5\u5177\u8C03\u7528 ID\uFF1A${c}`,
                  );
                return;
              }
              const f = { name: m };
              (m === V.getPageMarkdown && (f.tabId = hp(l)), e.set(c, f));
            });
        });
        const t = [];
        o.forEach((s, l) => {
          if (s.role !== "tool") return;
          const c = s.tool_call_id;
          if (!c)
            throw new Error(
              "\u5DE5\u5177\u54CD\u5E94\u7F3A\u5C11 tool_call_id",
            );
          const m = e.get(c);
          const f = s.name || m?.name;
          if (!f)
            throw new Error(
              `\u5DE5\u5177\u54CD\u5E94\u7F3A\u5C11 name\uFF1A${c}`,
            );
          if (f === V.getPageMarkdown) {
            if (!fp(s.content)) return;
            const h = m?.tabId;
            if (!h)
              throw new Error(
                `get_page \u5DE5\u5177\u54CD\u5E94\u7F3A\u5C11 tabId\uFF1A${c}`,
              );
            t.push({ tabId: h, type: f, callId: c, index: l });
            return;
          }
          if (f === V.openBrowserPage) {
            const h = mp(s.content);
            if (!h) return;
            t.push({ tabId: h, type: f, callId: c, index: l });
          }
        });
        const r = new Map();
        t.forEach((s) => {
          const l = r.get(s.tabId);
          (!l || s.index > l.index) && r.set(s.tabId, s);
        });
        const i = new Set();
        const n = new Set();
        return (
          t.forEach((s) => {
            const l = r.get(s.tabId);
            if (!(!l || l.callId === s.callId)) {
              if (s.type === V.getPageMarkdown) {
                i.add(s.callId);
                return;
              }
              s.type === V.openBrowserPage && n.add(s.callId);
            }
          }),
          { removeToolCallIds: i, trimOpenPageResponseIds: n }
        );
      }),
      (gp = (o, e) => (e.has(o.tool_call_id) ? "**\u6210\u529F**" : o.content)),
      (Vl = (o, e) => {
        if (!Array.isArray(o)) return [];
        const t = [];
        return (
          o.forEach((r) => {
            const i = eo(r);
            const n = to(r);
            e.has(i) ||
              t.push({ call: r, callId: i, name: n, arguments: Qt(r) });
          }),
          t
        );
      }),
      (Wl = ({ systemPrompt: o, format: e }) => {
        const t = [];
        e === "chat" && o && t.push({ role: "system", content: o });
        const { removeToolCallIds: r, trimOpenPageResponseIds: i } = vp(
          g.messages,
        );
        return (
          g.messages.forEach((n) => {
            if (n.role === "tool") {
              const l = n.tool_call_id;
              if (!l)
                throw new Error(
                  "\u5DE5\u5177\u54CD\u5E94\u7F3A\u5C11 tool_call_id",
                );
              if (r.has(l)) return;
              const c = gp(n, i);
              if (e === "chat") {
                t.push({ role: "tool", content: c, tool_call_id: l });
                return;
              }
              t.push({ type: "function_call_output", call_id: l, output: c });
              return;
            }
            if (
              e === "responses" &&
              n.role !== "user" &&
              n.role !== "assistant"
            )
              return;
            if (e === "chat") {
              const l = { role: n.role };
              n.content && (l.content = n.content);
              const c = Vl(n.tool_calls, r);
              (c.length && (l.tool_calls = c.map(up)),
                (l.content || l.tool_calls?.length) && t.push(l));
              return;
            }
            (n.content && t.push({ role: n.role, content: n.content }),
              Vl(n.tool_calls, r).forEach((l) => {
                t.push({
                  type: "function_call",
                  call_id: l.callId,
                  name: l.name,
                  arguments: l.arguments,
                });
              }));
          }),
          t
        );
      }),
      (jl = (o) => Wl({ systemPrompt: o, format: "chat" })),
      (Kl = () => Wl({ format: "responses" })));
  });
  let yp;
  let bp;
  let xp;
  let Yl;
  let _p;
  let wp;
  let Ep;
  let Xl;
  let Ap;
  let Zl;
  const Jl = d(() => {
    ye();
    Ie();
    Mi();
    ae();
    gr();
    Se();
    ((yp = (o) => {
      if (!o) return null;
      if (o.function) {
        const { id: e } = o;
        const t = o.function?.name;
        const r = Qt(o);
        return !e || !t
          ? null
          : { id: e, call_id: o.call_id || e, name: t, arguments: r };
      }
      if (o.name) {
        const e = o.call_id || o.id;
        return e
          ? { id: e, call_id: e, name: o.name, arguments: o.arguments ?? "" }
          : null;
      }
      return null;
    }),
      (bp = async (o) => {
        const { url: e, focus: t } = Ul(o);
        const n = (await Yt())
          .map((h) => {
            if (typeof h.url !== "string" || !h.url.trim())
              throw new Error("\u6807\u7B7E\u9875\u7F3A\u5C11 URL");
            return { ...h, normalizedUrl: new URL(h.url).toString() };
          })
          .find((h) => h.normalizedUrl === e);
        if (n) {
          if (typeof n.id !== "number")
            throw new Error("\u6807\u7B7E\u9875\u7F3A\u5C11 TabID");
          return `\u5931\u8D25\uFF0C\u6D4F\u89C8\u5668\u4E2D\u5DF2\u5B58\u5728\u76F8\u540C\u9875\u9762\uFF0CTabID\uFF1A"${n.id}"`;
        }
        const s = await sl(e, t);
        if (Je(e)) {
          const h = s.title || "";
          return `**\u6253\u5F00\u6210\u529F**
TabID: "${s.id}"\uFF1B
\u6807\u9898\uFF1A"${h}"\uFF1B
**\u8BFB\u53D6\u5931\u8D25\uFF1A**
\u8BE5\u9875\u9762\u4E3A\u6D4F\u89C8\u5668\u5185\u90E8\u9875\u9762\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u3002`;
        }
        await ir(s.id);
        const l = await Xt(s.id, { type: "getPageContent" });
        const { title: c, url: m, content: f } = Li(l);
        return Je(m || e)
          ? `**\u6253\u5F00\u6210\u529F**
TabID: "${s.id}"\uFF1B
\u6807\u9898\uFF1A"${c}"\uFF1B
**\u8BFB\u53D6\u5931\u8D25\uFF1A**
\u8BE5\u9875\u9762\u4E3A\u6D4F\u89C8\u5668\u5185\u90E8\u9875\u9762\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u3002`
          : `**\u6253\u5F00\u6210\u529F**
TabID: "${s.id}"\uFF1B
\u6807\u9898\uFF1A"${c}"\uFF1B
\u5185\u5BB9\uFF1A
${f}`;
      }),
      (xp = async (o) => {
        const { id: e } = Hl(o);
        const t = await Yt();
        if (!t.length)
          throw new Error("\u672A\u627E\u5230\u53EF\u7528\u6807\u7B7E\u9875");
        const r = { errors: [], notFoundCount: 0, done: !1, result: "" };
        const i = await t.reduce(async (n, s) => {
          const l = await n;
          if (l.done) return l;
          if (typeof s.id !== "number")
            return {
              ...l,
              errors: [...l.errors, "\u6807\u7B7E\u9875\u7F3A\u5C11 TabID"],
            };
          try {
            await ir(s.id, 3e3);
            const c = await Xt(s.id, { type: "ClickButton", id: e });
            if (c?.ok) return { ...l, done: !0, result: "\u6210\u529F" };
            if (c?.ok === !1 && c.reason === "not_found")
              return { ...l, notFoundCount: l.notFoundCount + 1 };
            throw new Error(
              "\u6309\u94AE\u70B9\u51FB\u8FD4\u56DE\u7ED3\u679C\u5F02\u5E38",
            );
          } catch (c) {
            const m = c?.message || "\u70B9\u51FB\u5931\u8D25";
            return { ...l, errors: [...l.errors, `TabID ${s.id}: ${m}`] };
          }
        }, Promise.resolve(r));
        if (i.done) return i.result;
        throw i.errors.length
          ? i.notFoundCount
            ? new Error(
                `\u672A\u5728\u4EFB\u4F55\u6807\u7B7E\u9875\u627E\u5230 id \u4E3A ${e} \u7684\u6309\u94AE\uFF0C\u4E14\u90E8\u5206\u6807\u7B7E\u9875\u53D1\u751F\u9519\u8BEF\uFF1A${i.errors.join("\uFF1B")}`,
              )
            : new Error(
                `\u6240\u6709\u6807\u7B7E\u9875\u70B9\u51FB\u5931\u8D25\uFF1A${i.errors.join("\uFF1B")}`,
              )
          : new Error(`\u672A\u627E\u5230 id \u4E3A ${e} \u7684\u6309\u94AE`);
      }),
      (Yl = async (o) => {
        const { tabId: e } = vr(o);
        const r = (await Yt()).find((c) => c.id === e);
        if (!r)
          throw new Error(
            `\u672A\u627E\u5230 TabID \u4E3A ${e} \u7684\u6807\u7B7E\u9875`,
          );
        if (typeof r.url !== "string" || !r.url.trim())
          throw new Error("\u6807\u7B7E\u9875\u7F3A\u5C11 URL");
        if (Je(r.url))
          return `**\u6807\u9898\uFF1A**
${r.title || ""}
**URL\uFF1A**
${r.url}
**\u8BFB\u53D6\u5931\u8D25\uFF1A**
\u8BE5\u9875\u9762\u4E3A\u6D4F\u89C8\u5668\u5185\u90E8\u9875\u9762\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u3002`;
        await ir(e);
        const i = await Xt(e, { type: "getPageContent" });
        const { title: n, url: s, content: l } = Li(i);
        return Je(s)
          ? `**\u6807\u9898\uFF1A**
${n}
**URL\uFF1A**
${s}
**\u8BFB\u53D6\u5931\u8D25\uFF1A**
\u8BE5\u9875\u9762\u4E3A\u6D4F\u89C8\u5668\u5185\u90E8\u9875\u9762\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u3002`
          : `**\u6807\u9898\uFF1A**
${n}
**URL\uFF1A**
${s}
**\u5185\u5BB9\uFF1A**
${l}`;
      }),
      (_p = async (o) => {
        const { tabId: e } = Nl(o);
        return (await al(e), "\u6210\u529F");
      }),
      (wp = async (o) => {
        const { command: e } = Fl(o);
        const t = await Ii({ command: e });
        if (!t?.ok)
          throw new Error(t?.error || "\u547D\u4EE4\u6267\u884C\u5931\u8D25");
        return t.output;
      }),
      (Ep = async (o) => (
        ql(o),
        (await Yt()).map((t) => {
          const r = t.title || "\u65E0\u6807\u9898";
          const i = t.url || "\u65E0\u5730\u5740";
          const { id: n } = t;
          return `\u6807\u9898: "${r}"
URL: "${i}"
TabID: "${n}"`;
        }).join(`

`)
      )),
      (Xl = async (o) => Yl({ tabId: o })),
      (Ap = async (o) => {
        const e = yp(o);
        if (!e)
          throw new Error(
            "\u5DE5\u5177\u8C03\u7528\u683C\u5F0F\u4E0D\u6B63\u786E",
          );
        const t = fr(e.arguments || "{}");
        if (e.name === V.openBrowserPage) return bp(t);
        if (e.name === V.clickButton) return xp(t);
        if (e.name === V.getPageMarkdown) return Yl(t);
        if (e.name === V.closeBrowserPage) return _p(t);
        if (e.name === V.runConsoleCommand) return wp(t);
        if (e.name === V.listTabs) return Ep(t);
        throw new Error(`\u672A\u652F\u6301\u7684\u5DE5\u5177\uFF1A${e.name}`);
      }),
      (Zl = async (o) => {
        await o.reduce(async (e, t) => {
          await e;
          const r = eo(t);
          const i = to(t);
          let n = "\u6210\u529F";
          try {
            n = await Ap(t);
          } catch (s) {
            const l = s?.message || "\u5DE5\u5177\u8C03\u7528\u5931\u8D25";
            (B(q, l),
              (n =
                i === V.closeBrowserPage
                  ? "\u5931\u8D25"
                  : `\u5931\u8D25: ${l}`));
          }
          de({ role: "tool", content: n, tool_call_id: r, name: i });
        }, Promise.resolve());
      }));
  });
  let Cp;
  let oo;
  let Ql;
  let ed;
  let td;
  let od;
  let rd;
  let id;
  let Ui;
  const nd = d(() => {
    Ie();
    ((Cp = ({
      id: o,
      callId: e,
      name: t,
      argumentsText: r,
      defaultArguments: i,
    }) => {
      if (!t) return null;
      const n = e || o;
      return {
        id: n,
        type: "function",
        function: { name: t, arguments: typeof r === "string" ? r : i },
        call_id: n,
      };
    }),
      (oo = (o, e) => o.map((t) => Cp(e(t))).filter(Boolean)),
      (Ql = (o, e) => {
        const t = { ...o };
        return (
          e.forEach((r) => {
            const i = typeof r.index === "number" ? r.index : 0;
            const n = t[i] || {
              id: r.id,
              type: r.type || "function",
              function: { name: r.function?.name || "", arguments: "" },
            };
            const s = { ...n, function: { ...n.function } };
            (r.id && (s.id = r.id),
              r.type && (s.type = r.type),
              r.function?.name && (s.function.name = r.function.name),
              typeof r.function?.arguments === "string" &&
                (s.function.arguments = `${s.function.arguments || ""}${r.function.arguments}`),
              (t[i] = s));
          }),
          t
        );
      }),
      (ed = (o) =>
        oo(Object.values(o), (e) => ({
          id: e.id,
          callId: e.call_id,
          name: e.function?.name,
          argumentsText: e.function?.arguments,
        }))),
      (td = (o, e, t) => {
        const r = { ...o };
        const i = e?.type || t;
        if (i === "response.output_item.added")
          return (
            e?.item?.type === "function_call" &&
              (r[e.output_index] = { ...e.item }),
            r
          );
        if (i === "response.output_item.done")
          return (
            e?.item?.type === "function_call" &&
              (r[e.output_index] = { ...e.item }),
            r
          );
        if (i === "response.function_call_arguments.delta") {
          const n = e?.output_index;
          if (typeof n !== "number" || !r[n]) return r;
          const s = r[n];
          return (
            (r[n] = {
              ...s,
              arguments: `${s.arguments || ""}${e.delta || ""}`,
            }),
            r
          );
        }
        if (i === "response.function_call_arguments.done") {
          const n = e?.output_index;
          if (typeof n !== "number" || !r[n]) return r;
          typeof e.arguments === "string" &&
            (r[n] = { ...r[n], arguments: e.arguments });
        }
        return r;
      }),
      (od = (o) =>
        oo(Object.values(o), (e) => ({
          id: e.id,
          callId: e.call_id,
          name: e?.name,
          argumentsText: e.arguments,
          defaultArguments: "",
        }))),
      (rd = (o) => {
        const e = o?.choices?.[0]?.message;
        if (!e) return [];
        if (Array.isArray(e.tool_calls))
          return oo(e.tool_calls, (t) => ({
            id: t.id,
            callId: t.call_id,
            name: t.function?.name,
            argumentsText: t.function?.arguments,
          }));
        if (e.function_call) {
          const t = e.function_call;
          return oo([t], () => ({
            id: e.id || t.name,
            callId: e.id || t.name,
            name: t.name,
            argumentsText: t.arguments,
            defaultArguments: "",
          }));
        }
        return [];
      }),
      (id = (o) => {
        const e = Array.isArray(o?.output) ? o.output : [];
        return oo(
          e.filter((t) => t?.type === "function_call"),
          (t) => ({
            id: t.id,
            callId: t.call_id,
            name: t.name,
            argumentsText: t.arguments,
            defaultArguments: "",
          }),
        );
      }),
      (Ui = (o, e) => {
        if (!o.length) return;
        const t = typeof e === "number" ? e : g.messages.length - 1;
        const r = g.messages[t];
        if (r && r.role === "assistant") {
          er(t, { tool_calls: o });
          return;
        }
        de({ role: "assistant", content: "", tool_calls: o });
      }));
  });
  const Hi = d(() => {
    gr();
    Gl();
    Jl();
    nd();
  });
  let sd;
  let ad;
  let Tp;
  let ld;
  let dd;
  let cd;
  const qi = d(() => {
    ae();
    ((sd = async (o, e) => {
      if (!o.body)
        throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u6D41\u5F0F\u54CD\u5E94");
      const t = o.body.getReader();
      const r = new TextDecoder("utf-8");
      let i = "";
      let n = "";
      let s = !1;
      const l = (m) => {
        if (s) return;
        const f = m.trim();
        if (!f) {
          n = "";
          return;
        }
        if (f.startsWith("event:")) {
          n = f.replace(/^event:\s*/, "").trim();
          return;
        }
        if (!f.startsWith("data:")) return;
        const h = f.replace(/^data:\s*/, "");
        if (h === "[DONE]") {
          s = !0;
          return;
        }
        const b = jt(h);
        if (b?.error?.message) throw new Error(b.error.message);
        (e(b, n), (n = ""));
      };
      const c = async () => {
        const { value: m, done: f } = await t.read();
        if (f || s) return;
        i += r.decode(m, { stream: !0 });
        const h = i.split(/\r?\n/);
        ((i = h.pop() || ""), h.forEach(l), !s && (await c()));
      };
      await c();
    }),
      (ad = (o) =>
        o?.choices?.[0]?.delta?.content ||
        o?.choices?.[0]?.text ||
        o?.choices?.[0]?.message?.content ||
        ""),
      (Tp = (o, e) => {
        const t = o?.type || e;
        return t === "response.output_text.delta"
          ? o?.delta || o?.text || ""
          : t === "response.refusal.delta"
            ? o?.delta || ""
            : ad(o);
      }),
      (ld = (o, { onDelta: e, onToolCallDelta: t }) =>
        sd(o, (r) => {
          const i = ad(r);
          i && e(i);
          const n = r?.choices?.[0]?.delta?.tool_calls;
          Array.isArray(n) && t && t(n);
        })),
      (dd = (o, { onDelta: e, onToolCallEvent: t }) =>
        sd(o, (r, i) => {
          const n = Tp(r, i);
          (n && e(n), t && t(r, i));
        })),
      (cd = (o) => {
        if (typeof o?.output_text === "string") return o.output_text.trim();
        const e = Array.isArray(o?.output) ? o.output : [];
        const t = [];
        return (
          e.forEach((r) => {
            r?.type !== "message" ||
              !Array.isArray(r.content) ||
              r.content.forEach((i) => {
                i?.type === "output_text" &&
                  typeof i.text === "string" &&
                  t.push(i.text);
              });
          }),
          t.join("").trim()
        );
      }));
  });
  let Ip;
  let Sp;
  let Vi;
  const Wi = d(() => {
    Hi();
    qi();
    ((Ip = {
      chat: {
        buildRequestBody: (o, e, t) => ({
          model: o.model,
          messages: jl(e),
          stream: !0,
          tools: t,
        }),
        stream: async (o, { onDelta: e }) => {
          let t = {};
          return (
            await ld(o, {
              onDelta: e,
              onToolCallDelta: (r) => {
                t = Ql(t, r);
              },
            }),
            ed(t)
          );
        },
        extractToolCalls: (o) => rd(o),
        extractReply: (o) => o?.choices?.[0]?.message?.content?.trim(),
      },
      responses: {
        buildRequestBody: (o, e, t) => ({
          model: o.model,
          input: Kl(),
          stream: !0,
          tools: t,
          ...(e ? { instructions: e } : {}),
        }),
        stream: async (o, { onDelta: e }) => {
          let t = {};
          return (
            await dd(o, {
              onDelta: e,
              onToolCallEvent: (r, i) => {
                t = td(t, r, i);
              },
            }),
            od(t)
          );
        },
        extractToolCalls: (o) => id(o),
        extractReply: (o) => cd(o),
      },
    }),
      (Sp = (o) => {
        const e = Ip[o];
        if (!e)
          throw new Error(`\u4E0D\u652F\u6301\u7684 API \u7C7B\u578B: ${o}`);
        return e;
      }),
      (Vi = Sp));
  });
  let $p;
  let ji;
  const pd = d(() => {
    Se();
    Wi();
    (($p = async ({
      settings: o,
      systemPrompt: e,
      tools: t,
      onDelta: r,
      onStreamStart: i,
      signal: n,
    }) => {
      const s = Vi(o.apiType);
      const l = s.buildRequestBody(o, e, t);
      const c = await fetch(tl(o.baseUrl, o.apiType), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${o.apiKey}`,
        },
        body: JSON.stringify(l),
        signal: n,
      });
      if (!c.ok) {
        const _ = await c.text();
        throw new Error(_ || "\u8BF7\u6C42\u5931\u8D25");
      }
      if ((c.headers.get("content-type") || "").includes("text/event-stream"))
        return (
          typeof i === "function" && i(),
          { toolCalls: await s.stream(c, { onDelta: r }), streamed: !0 }
        );
      const f = await c.json();
      const h = s.extractToolCalls(f);
      const b = s.extractReply(f);
      return { toolCalls: h, reply: b, streamed: !1 };
    }),
      (ji = $p));
  });
  const ud = d(() => {
    pd();
    qi();
    Wi();
  });
  let Ki;
  let Rp;
  let Op;
  let Pp;
  let kp;
  let Lp;
  let Mp;
  let Gi;
  const Yi = d(() => {
    ye();
    Ie();
    Se();
    ((Ki = (o) => {
      q && B(q, o);
    }),
      (Rp = (o) => {
        window.setTimeout(() => {
          g.sending || (q?.textContent === o && Ki(""));
        }, 1500);
      }),
      (Op = async () => {
        if (!g.messages.length) {
          await Jo(g.conversationId);
          return;
        }
        (or(), await Zo(g.conversationId, g.messages, g.updatedAt));
      }),
      (Pp = async (o) => {
        const e = g.messages[o];
        if (!e) throw new Error("\u6D88\u606F\u7D22\u5F15\u65E0\u6548");
        if (typeof navigator?.clipboard?.writeText !== "function")
          throw new Error(
            "\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u590D\u5236",
          );
        (await navigator.clipboard.writeText(e.content || ""),
          g.sending || (Ki("\u5DF2\u590D\u5236"), Rp("\u5DF2\u590D\u5236")));
      }),
      (kp = async (o, e) => {
        if (g.sending)
          throw new Error(
            "\u56DE\u590D\u4E2D\uFF0C\u6682\u65F6\u65E0\u6CD5\u5220\u9664\u6D88\u606F",
          );
        (tr(o), e(), await Op());
      }),
      (Lp = (o) => {
        const e = o?.message || "\u64CD\u4F5C\u5931\u8D25";
        Ki(e);
      }),
      (Mp = (o) => {
        if (typeof o !== "function")
          throw new Error("\u5237\u65B0\u6D88\u606F\u56DE\u8C03\u7F3A\u5931");
        return {
          onCopy: (e) => Pp(e),
          onDelete: (e) => kp(e, o),
          onError: Lp,
        };
      }),
      (Gi = Mp));
  });
  let ro;
  let Dp;
  let zp;
  let le;
  let hd;
  const yr = d(() => {
    Ie();
    ye();
    Yi();
    ((ro = null),
      (Dp = () => {
        if (!ro)
          throw new Error(
            "\u6D88\u606F\u64CD\u4F5C\u5904\u7406\u5668\u5C1A\u672A\u521D\u59CB\u5316",
          );
        zi(g.messages, ro);
      }),
      (zp = () => (ro || (ro = Gi(Dp)), ro)),
      (le = () => {
        zi(g.messages, zp());
      }),
      (hd = (o) => {
        if (!o) return;
        const e = g.messages.length - 1;
        const t = g.messages[e];
        if (!t || t.role !== "assistant") {
          (de({ role: "assistant", content: o }), le());
          return;
        }
        const r = er(e, { content: `${t.content || ""}${o}` });
        (!r.hidden && Cl(r.content)) || le();
      }));
  });
  let xr;
  let md;
  let br;
  let Xi;
  let Bp;
  let Np;
  let Fp;
  let fd;
  let _r;
  let vd;
  let gd;
  const Zi = d(() => {
    ye();
    Ie();
    Se();
    Hi();
    ud();
    ae();
    yr();
    ((xr = null),
      (md = (o) => {
        (dr.classList.toggle("hidden", o),
          $e.classList.toggle("hidden", o),
          cr.classList.toggle("hidden", !o));
      }),
      (br = (o) => {
        if (o?.aborted) throw new Error("\u5DF2\u505C\u6B62");
      }),
      (Xi = async () => {
        g.messages.length &&
          (or(), await Zo(g.conversationId, g.messages, g.updatedAt));
      }),
      (Bp = async () => {
        const o = await rr();
        if (typeof o.id !== "number")
          throw new Error("\u6D3B\u52A8\u6807\u7B7E\u9875\u7F3A\u5C11 TabID");
        B(q, "\u8BFB\u53D6\u9875\u9762\u4E2D\u2026");
        const e = Be("local");
        const t = { tabId: o.id };
        const r = await Xl(o.id);
        const i = {
          id: e,
          type: "function",
          function: {
            name: V.getPageMarkdown,
            arguments: JSON.stringify(t),
          },
          call_id: e,
        };
        (de({ role: "assistant", content: "", tool_calls: [i] }),
          de({
            role: "tool",
            content: r,
            tool_call_id: e,
            name: V.getPageMarkdown,
          }));
      }),
      (Np = (o, e) => {
        if (!Number.isInteger(e))
          throw new Error(
            "\u6D41\u5F0F\u56DE\u590D\u7F3A\u5C11\u6D88\u606F\u7D22\u5F15",
          );
        const r = !!g.messages[e]?.content?.trim();
        if ((o.length && Ui(o, e), !r && !o.length))
          throw (
            tr(e),
            le(),
            new Error("\u672A\u6536\u5230\u6709\u6548\u56DE\u590D")
          );
        le();
      }),
      (Fp = (o, e) => {
        if (
          (o && (de({ role: "assistant", content: o }), le()),
          e.length && (Ui(e), le()),
          !o && !e.length)
        )
          throw new Error("\u672A\u6536\u5230\u6709\u6548\u56DE\u590D");
      }),
      (fd = async () => {
        xr && (xr.abort(), B(q, "\u5DF2\u505C\u6B62"), await Xi());
      }),
      (_r = async ({ includePage: o = !1 } = {}) => {
        if (g.sending) return;
        const e = tt.value.trim();
        if (!e) return;
        const t = await Ne();
        if (!t.apiKey || !t.baseUrl || !t.model) {
          (Et(),
            Ue(t),
            B(
              et,
              "\u8BF7\u5148\u8865\u5168 API Key\u3001Base URL \u548C\u6A21\u578B",
            ));
          return;
        }
        (de({ role: "user", content: e }),
          (tt.value = ""),
          le(),
          (g.sending = !0));
        const r = new AbortController();
        ((xr = r), md(!0));
        try {
          (await Xi(),
            br(r.signal),
            o && (await Bp()),
            br(r.signal),
            B(q, "\u8BF7\u6C42\u4E2D\u2026"));
          const i = async () => {
            br(r.signal);
            let n = null;
            const s = () => {
              ((n = g.messages.length),
                de({ role: "assistant", content: "" }),
                le(),
                B(q, "\u56DE\u590D\u4E2D\u2026"));
            };
            const l = await Oi();
            const c = zl(t.apiType);
            const {
              toolCalls: m,
              reply: f,
              streamed: h,
            } = await ji({
              settings: t,
              systemPrompt: l,
              tools: c,
              onDelta: hd,
              onStreamStart: s,
              signal: r.signal,
            });
            const b = m || [];
            (h ? Np(b, n) : Fp(f, b),
              b.length &&
                (await Zl(b),
                br(r.signal),
                B(q, "\u8BF7\u6C42\u4E2D\u2026"),
                await i()));
          };
          (await i(), await Xi(), B(q, ""));
        } catch (i) {
          if (i?.name === "AbortError" || i?.message === "\u5DF2\u505C\u6B62") {
            B(q, "\u5DF2\u505C\u6B62");
            return;
          }
          B(q, `${i.message}`);
        } finally {
          ((g.sending = !1), (xr = null), md(!1));
        }
      }),
      (vd = () => _r({ includePage: !0 })),
      (gd = (o) => {
        o.key === "Enter" && !o.shiftKey && (o.preventDefault(), _r());
      }));
  });
  let Up;
  let Hp;
  let yd;
  let bd;
  let xd;
  const Ji = d(() => {
    ye();
    Ie();
    yr();
    Se();
    ((Up = (o) => {
      const e = new Date(o);
      const t = (r) => String(r).padStart(2, "0");
      return `${e.getFullYear()}-${t(e.getMonth() + 1)}-${t(e.getDate())} ${t(e.getHours())}:${t(e.getMinutes())}`;
    }),
      (Hp = async (o) => {
        if (g.sending) return;
        if (o === g.conversationId) {
          bt.classList.add("hidden");
          return;
        }
        const e = await ja(o);
        (rl(e.id, e.messages, e.updatedAt),
          le(),
          bt.classList.add("hidden"),
          B(q, ""));
      }),
      (yd = async () => {
        const o = await Wt();
        if (((pr.innerHTML = ""), !o.length)) {
          pr.innerHTML =
            '<div class="history-empty">\u6682\u65E0\u5386\u53F2\u8BB0\u5F55</div>';
          return;
        }
        [...o]
          .sort((t, r) => r.updatedAt - t.updatedAt)
          .forEach((t) => {
            const r = document.createElement("md-list-item");
            ((r.type = "button"),
              t.id === g.conversationId && r.classList.add("active"));
            const i = document.createElement("div");
            ((i.slot = "headline"),
              (i.textContent = Up(t.updatedAt)),
              r.appendChild(i));
            const n = document.createElement("md-icon-button");
            ((n.slot = "end"),
              (n.className = "delete-icon"),
              (n.title = "\u5220\u9664"));
            const s = document.createElement("md-icon");
            ((s.textContent = "delete"),
              n.appendChild(s),
              n.addEventListener("click", async (l) => {
                (l.stopPropagation(),
                  (await Ni(
                    "\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\u5417\uFF1F",
                  )) &&
                    (await Jo(t.id),
                    t.id === g.conversationId && (Ri(), le(), B(q, "")),
                    await yd()));
              }),
              r.appendChild(n),
              (r.dataset.id = t.id),
              r.addEventListener("click", () => Hp(t.id)),
              pr.appendChild(r));
          });
      }),
      (bd = async () => {
        (bt.classList.contains("hidden") && (await yd()),
          bt.classList.toggle("hidden"));
      }),
      (xd = async () => {
        g.sending || (Ri(), le(), bt.classList.add("hidden"), B(q, ""));
      }));
  });
  let qp;
  let Qi;
  const en = d(() => {
    ye();
    mr();
    Fi();
    Zi();
    Ji();
    ((qp = () => {
      (cl.addEventListener("click", Pl),
        pl.addEventListener("click", kl),
        dl.addEventListener("click", Ll),
        dr.addEventListener("click", _r),
        $e.addEventListener("click", vd),
        cr.addEventListener("click", fd),
        tt.addEventListener("keydown", gd),
        ul.addEventListener("click", xd),
        hl.addEventListener("click", bd),
        Qe.addEventListener("change", Ml),
        chrome.tabs.onActivated.addListener(() => {
          At();
        }),
        chrome.tabs.onUpdated.addListener((o, e, t) => {
          t?.active && (e.url || e.status === "complete") && At();
        }));
    }),
      (Qi = qp));
  });
  let Vp;
  let tn;
  const _d = d(() => {
    Se();
    ye();
    en();
    mr();
    ((Vp = async () => {
      const o = await Ne();
      (Ue(o),
        ot(o.theme),
        o.apiKey && o.baseUrl && o.model ? Jt() : Et(),
        Qi(),
        await At());
    }),
      (tn = Vp));
  });
  const wd = d(() => {
    _d();
    en();
    Ji();
    Yi();
    yr();
    Zi();
    Fi();
    mr();
  });
  const Wp = nn(() => {
    const Xw = $d(Wa());
    wd();
    tn();
  });
  Wp();
})();
