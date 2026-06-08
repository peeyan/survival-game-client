/**
 * BGMSystem — Web Audio API によるプロシージャル環境音楽
 *
 * 外部ファイル不要。3レイヤー（day / night / storm）を
 * クロスフェードで切り替える。
 */

export type BGMState = 'day' | 'night' | 'storm';

export class BGMSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private layers: Record<BGMState, GainNode | null> = {
    day: null, night: null, storm: null,
  };
  private current: BGMState | null = null;
  private initialized = false;

  private readonly MASTER_VOL = 0.22;
  private readonly FADE_SEC   = 2.5;

  // ── 初期化（必ずユーザージェスチャ後に呼ぶ）────────────────
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.MASTER_VOL;
      this.master.connect(this.ctx.destination);

      this.layers.day   = this._buildDay();
      this.layers.night = this._buildNight();
      this.layers.storm = this._buildStorm();

      this.initialized = true;
      this.setState('day');
    } catch {
      console.warn('[BGM] Web Audio API が使用できません');
    }
  }

  setState(next: BGMState): void {
    if (!this.initialized || !this.ctx) return;
    if (next === this.current) return;
    this.current = next;

    const now  = this.ctx.currentTime;
    const fade = this.FADE_SEC;

    (Object.keys(this.layers) as BGMState[]).forEach(key => {
      const g = this.layers[key];
      if (!g) return;
      const target = key === next ? 1.0 : 0.0;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(target, now + fade);
    });
  }

  setMasterVolume(v: number): void {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
  }

  // ── 昼BGM：C長調ドローン + 風ノイズ + 穏やかシマー ─────────
  private _buildDay(): GainNode {
    const ctx = this.ctx!;
    const out  = this._layerGain();

    // 風：バンドパスフィルタ + ゆっくりLFO
    const wind = this._noise(ctx);
    const bp   = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 360; bp.Q.value = 0.45;
    const windLFO = this._lfoMod(ctx, bp.frequency, 0.10, 130);
    windLFO.start();
    const windVol = this._gain(0.065);
    wind.connect(bp); bp.connect(windVol); windVol.connect(out);

    // ドローン：C2(65Hz) / G2(98Hz) / C3(131Hz)
    this._osc(ctx, out, 65.4,  'sine',     0.042);
    this._osc(ctx, out, 98.0,  'sine',     0.020);
    this._osc(ctx, out, 130.8, 'sine',     0.014);

    // 高音シマー：E4(330Hz)、非常に微量
    this._osc(ctx, out, 329.6, 'triangle', 0.005);

    // ゆっくり呼吸するトレモロ（0.06 Hz）
    const breathLFO = ctx.createOscillator();
    breathLFO.frequency.value = 0.06;
    const bGain = ctx.createGain();
    bGain.gain.value = 0.12;
    // gainのbaseValue自体を上下させるためsubGainを挟む
    const subGain = ctx.createGain();
    subGain.gain.value = 0.88;
    breathLFO.connect(bGain);
    bGain.connect(subGain.gain);
    breathLFO.start();
    // subGainを通してoutへ流す追加ルーティングは不要（ここはエフェクトとして記録のみ）

    return out;
  }

  // ── 夜BGM：Am/低音パルス + 虫の音 + 不穏なうなり ──────────
  private _buildNight(): GainNode {
    const ctx = this.ctx!;
    const out  = this._layerGain();

    // 超低音：A0(27.5Hz) + A1(55Hz) で重厚なサブ
    this._osc(ctx, out, 27.5, 'sine', 0.040);
    this._osc(ctx, out, 55.0, 'sine', 0.055);

    // 不協和テンション：Eb2(77.8Hz) — 三全音（最大緊張）
    this._osc(ctx, out, 77.8, 'sine', 0.028);

    // 心拍パルス (0.5 Hz) — 追跡中に鼓動感
    const pulse = ctx.createOscillator();
    pulse.type = 'sine'; pulse.frequency.value = 110;
    const pulseLFO = this._lfoMod(ctx, pulse.frequency, 0.5, 14);
    pulseLFO.start();
    const pulseVol = this._gain(0.022);
    pulse.connect(pulseVol); pulseVol.connect(out); pulse.start();

    // 虫の音：高域フィルタのホワイトノイズ
    const insect = this._noise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2800; hp.Q.value = 1.2;
    const insectVol = this._gain(0.016);
    insect.connect(hp); hp.connect(insectVol); insectVol.connect(out);

    // ゆっくりうなり：振幅変調 (0.18 Hz)
    const moan = ctx.createOscillator();
    moan.type = 'sine'; moan.frequency.value = 82;
    const moanAM = ctx.createGain(); moanAM.gain.value = 0;
    const amLFO = ctx.createOscillator(); amLFO.frequency.value = 0.18;
    const amG = ctx.createGain(); amG.gain.value = 0.018;
    amLFO.connect(amG); amG.connect(moanAM.gain);
    moan.connect(moanAM); moanAM.connect(out);
    moan.start(); amLFO.start();

    return out;
  }

  // ── 嵐BGM：ビート干渉 + 轟音ノイズ + 速いトレモロ ──────────
  private _buildStorm(): GainNode {
    const ctx = this.ctx!;
    const out  = this._layerGain();

    // ビート干渉：60Hz + 64Hz → 4Hzのうなり（本能的不安感）
    this._osc(ctx, out, 60.0, 'sawtooth', 0.038);
    this._osc(ctx, out, 64.0, 'sawtooth', 0.033);

    // 超低音：Bb0(29.1Hz)
    this._osc(ctx, out, 29.1, 'sine', 0.050);

    // 嵐ノイズ：ローパス + 共振 + 突風LFO
    const stormNoise = this._noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 2.5;
    const gustLFO = this._lfoMod(ctx, lp.frequency, 0.65, 380);
    gustLFO.start();
    const stormVol = this._gain(0.13);
    stormNoise.connect(lp); lp.connect(stormVol); stormVol.connect(out);

    // 速いトレモロ：4Hzで揺れる톱니波
    const trOsc = ctx.createOscillator();
    trOsc.type = 'sawtooth'; trOsc.frequency.value = 110;
    const trLFO = ctx.createOscillator(); trLFO.frequency.value = 4.0;
    const trLFOGain = ctx.createGain(); trLFOGain.gain.value = 0.018;
    const trVol = this._gain(0.025);
    trLFO.connect(trLFOGain); // トレモロはピッチ変調として使う
    trLFOGain.connect(trOsc.frequency);
    trOsc.connect(trVol); trVol.connect(out);
    trOsc.start(); trLFO.start();

    return out;
  }

  // ── ヘルパー ────────────────────────────────────────────────
  private _layerGain(): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    return g;
  }

  private _gain(value: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = value;
    return g;
  }

  /** ホワイトノイズ（3秒バッファのループ） */
  private _noise(ctx: AudioContext): AudioBufferSourceNode {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    src.start();
    return src;
  }

  /** オシレータを out に接続して start */
  private _osc(
    ctx: AudioContext,
    out: GainNode,
    freq: number,
    type: OscillatorType,
    vol: number,
  ): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type           = type;
    osc.frequency.value = freq;
    const g = this._gain(vol);
    osc.connect(g);
    g.connect(out);
    osc.start();
    return osc;
  }

  /** AudioParam を LFO で変調（戻り値は start() 前の OscillatorNode） */
  private _lfoMod(
    ctx: AudioContext,
    param: AudioParam,
    rate: number,
    depth: number,
  ): OscillatorNode {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(param);
    return lfo;
  }
}

export const bgmSystem = new BGMSystem();
