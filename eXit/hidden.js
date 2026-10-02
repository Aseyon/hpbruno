const scene = document.getElementById('scene');
const sceneCtx = scene.getContext('2d', { alpha: false, willReadFrequently: true });
const screen = document.getElementById('screen');
const dustEl = document.getElementById('dust');

const SW = scene.width;
const SH = scene.height;
const OUT_W = 960;
const OUT_H = 720;
sceneCtx.imageSmoothingEnabled = false;

const ASSETS = {
  eXit: 'assets/eXit.png',
  barrel: 'assets/barrel.png',
  move_barrel: 'assets/move_barrel.png',
  friend: 'assets/friend.png',
  note: 'assets/note.png',
  light_note: 'assets/light_note.png',
  leave: 'assets/leave.png',
  boat: 'assets/boat.png',
  new_world: 'assets/new_world.png',
  poweroff: 'assets/poweroff.mp3'
};

const LOOK = {
  shadow: [0, 28, 25],
  mid: [8, 78, 73],
  hi: [83, 214, 198],
  white: [186, 248, 237],
  gamma: 0.88,
  contrast: 1.38,
  dither: 0.07
};

const BAYER = [
  [0,8,2,10], [12,4,14,6], [3,11,1,9], [15,7,13,5]
];

const images = {};
const filtered = {};
let started = false;
let ready = false;
let state = 'title';
let input = '';
let notice = '';
let noticeTimer = 0;
let lastTime = 0;
let flicker = 1;
let endingText = '';
let endingStartedAt = 0;

let shutdownStartedAt = 0;
let shutdownFinished = false;
let poweroffAudio = null;
let atmosphereAudio = null;
let gameMusic = null;
const audioFadeFrames = new WeakMap();

let mobileInput = null;
let mobileSend = null;
let mobileControls = null;
let orientationNotice = null;
const mobileSceneQuery = window.matchMedia(
  '(max-width: 900px), (max-height: 600px) and (orientation: landscape)'
);

const STATES = {
  barrel: {
    art: 'barrel',
    body: 'você está preso em uma masmorra com seu amigo.\nVocê vê um barril. O que você faz?',
    accepts: [
      'mover o barril',
      'mover barril',
      'mova o barril',
      'mova barril',
      'move the barrel',
      'move barrel',
      'mover',
      'empurrar o barril',
      'empurrar',
      'empurrar barril',
      'tirar barril',
      'tirar'
    ],
    altAccepts: [
      'sentar ao lado do meu amigo',
      'sentar ao lado do amigo',
      'sentar com meu amigo',
      'ficar ao lado do meu amigo',
      'sit next to my friend',
      'sit down next to my friend'
    ],
    next: 'move_barrel',
    altNext: 'sit_friend'
  },

  move_barrel: {
    art: 'move_barrel',
    body: 'O barril rola para o lado e você encontra um túnel secreto.\nO que você faz?',
    accepts: [
      'entrar no túnel',
      'entrar no tunel',
      'entrar túnel',
      'entrar tunel',
      'entrar no tunnel',
      'enter tunnel',
      'entrar'
    ],
    next: 'friend'
  },

  friend: {
  art: 'friend',

  body:
    'Você começa a escapar, mas seu amigo está fraco demais\n' +
    'para ir com você. Ele lhe entrega uma nota.\n' +
    'O que você faz?',

  choices: [
    {
      accepts: [
        'ler a nota',
        'ler nota',
        'leia a nota',
        'leia nota',
        'read the note',
        'read note'
      ],

      next: 'note'
    },

    {
      accepts: [
        'ir embora',
        'ir embora daqui',
        'sair',
        'deixar',
        'ir',
        'leave'
      ],

      next: 'leave'
    }
  ]
},

  note: {
    art: 'note',
    body: 'Está escuro demais para ler a nota.\nO que você faz?',

    choices: [
      {
        accepts: [
          'ir embora',
          'ir embora daqui',
          'sair',
          'deixar',
          'ir',
          'leave'
        ],
        next: 'leave'
      },

      {
        accepts: [
          'acender um fósforo',
          'acender um fosforo',
          'acender fósforo',
          'acender fosforo',
          'acender o fósforo',
          'acender o fosforo',
          'acenda um fósforo',
          'acenda um fosforo',
          'acenda fósforo',
          'acenda fosforo',
          'light a match',
          'light match'
        ],
        next: 'light_note'
      }
    ]
  },

  leave: {
    art: 'leave',
    body: 'Você rasteja pelo túnel, e o túnel leva a uma praia.\nO que você faz?',
    accepts: [
      'olhar',
      'olhe',
      'ver',
      'look'
    ],
    next: 'boat'
  },

  boat: {
    art: 'boat',
    body: 'Na água, você vê um barco.\nO que você faz?',
    accepts: [
      'entrar no barco',
      'entrar no bote',
      'subir no barco',
      'entrar barco',
      'entrar no barco agora',
      'get on the boat',
      'get on boat'
    ],
    next: 'new_world'
  },

  sit_friend: {
    art: 'note',
    body: 'Seu amigo lhe entrega uma nota.\nO que você faz?',
    choices: [
      {
        accepts: [
          'ler a nota',
          'ler nota',
          'leia a nota',
          'leia nota',
          'read the note',
          'read note'
        ],
        next: 'note'
      },
      {
        accepts: [
          'acender um fósforo',
          'acender um fosforo',
          'acender fósforo',
          'acender fosforo',
          'acender o fósforo',
          'acender o fosforo',
          'acenda o fósforo',
          'acenda o fosforo',
          'acenda um fósforo',
          'acenda um fosforo',
          'acenda fósforo',
          'acenda fosforo',
          'acendo um fósforo',
          'acendo um fosforo',
          'acendo o fósforo',
          'acendo o fosforo',
          'acendo fósforo',
          'acendo fosforo',
          'acender fósforo aqui',
          'acender fosforo aqui',
          'light a match',
          'light match'
        ],
        next: 'light_note'
      }
    ]
  },

  light_note: {
  art: 'light_note',

  body:
    'A nota diz: "não me deixe aqui."\n' +
    'Você deixa seu amigo ou fica?',

  choices: [
    {
      accepts: [
        'deixar meu amigo',
        'deixar o meu amigo',
        'deixar meu amigo aqui',
        'deixar o meu amigo aqui',
        'deixar ele',
        'deixá-lo',
        'deixa-lo',
        'ir embora',
        'ir embora e deixar meu amigo',
        'leave my friend',
        'leave him',
        'leave'
      ],

      next: 'leave'
    },

    {
      accepts: [
        'ficar',
        'fica',
        'ficar com meu amigo',
        'ficar com o meu amigo',
        'ficar ao lado dele',
        'ficar com ele',
        'stay'
      ],

      next: 'stay'
    }
  ]
},
};

function normalizeCommand(text) {
  return String(text || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”"'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function commandMatches(inputText, accepted) {
  const input = normalizeCommand(inputText);
  const target = normalizeCommand(accepted);

  if (!input || !target) return false;

  if (input === target) return true;

  const compactInput = input.replace(/\s+/g, '');
  const compactTarget = target.replace(/\s+/g, '');

  if (compactInput === compactTarget) return true;

  const inputWords = input.split(' ');
  const targetWords = target.split(' ');

  if (inputWords.length >= 2 && targetWords.length >= 2) {
    const shared = targetWords.filter(
      word => word.length > 2 && inputWords.includes(word)
    ).length;

    return shared >= Math.min(2, targetWords.length);
  }

  return false;
}

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

function mix(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

function paletteMap(l) {
  if (l <= 0.018) return [0, 0, 0];

  if (l < 0.27) {
    return mix(LOOK.shadow, LOOK.mid, l / 0.27);
  }

  if (l < 0.68) {
    return mix(LOOK.mid, LOOK.hi, (l - 0.27) / 0.41);
  }

  return mix(LOOK.hi, LOOK.white, (l - 0.68) / 0.32);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function gradeImage(source) {
  const out = document.createElement('canvas');

  out.width = SW;
  out.height = SH;

  const o = out.getContext('2d', {
    willReadFrequently: true
  });

  o.imageSmoothingEnabled = false;

  o.fillStyle = '#000';
  o.fillRect(0, 0, SW, SH);

  const fit = Math.min(
    SW / source.naturalWidth,
    SH / source.naturalHeight
  );

  const dw = Math.max(
    1,
    Math.round(source.naturalWidth * fit)
  );

  const dh = Math.max(
    1,
    Math.round(source.naturalHeight * fit)
  );

  const dx = Math.floor((SW - dw) / 2);
  const dy = Math.floor((SH - dh) / 2);

  o.drawImage(
    source,
    dx,
    dy,
    dw,
    dh
  );

  const data = o.getImageData(
    0,
    0,
    SW,
    SH
  );

  const d = data.data;

  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const i = (y * SW + x) * 4;

      const r = d[i] / 255;
      const g = d[i + 1] / 255;
      const b = d[i + 2] / 255;

      let lum =
        0.2126 * r +
        0.7152 * g +
        0.0722 * b;

      lum = Math.pow(clamp(lum), LOOK.gamma);

      lum = clamp(
        (lum - 0.5) * LOOK.contrast + 0.5
      );

      const threshold =
        (BAYER[y & 3][x & 3] / 16 - 0.5) *
        LOOK.dither;

      lum = clamp(lum + threshold);

      const c = paletteMap(lum);

      const lineGain =
        (y & 1) ? 0.90 : 1.0;

      d[i] = Math.round(c[0] * lineGain);
      d[i + 1] = Math.round(c[1] * lineGain);
      d[i + 2] = Math.round(c[2] * lineGain);
      d[i + 3] = 255;
    }
  }

  o.putImageData(data, 0, 0);

  return out;
}

async function preload() {
  await Promise.all(
    Object.entries(ASSETS).map(
      async ([key, src]) => {
        try {
          images[key] = await loadImage(src);
          filtered[key] = gradeImage(images[key]);
        } catch (err) {
          images[key] = null;
          filtered[key] = null;

          console.warn(
            `Imagem ausente: ${src}`
          );
        }
      }
    )
  );

  ready = true;

  setupDust();
  initCRT();

  requestAnimationFrame(frame);
}

function drawArt(key) {
  sceneCtx.fillStyle = '#000';
  sceneCtx.fillRect(
    0,
    0,
    SW,
    SH
  );

  if (filtered[key]) {
    sceneCtx.drawImage(
      filtered[key],
      0,
      0,
      SW,
      SH
    );
  } else {
    drawText(
      `imagem ausente: ${ASSETS[key] || key}`,
      SW / 2,
      SH / 2,
      11,
      'center'
    );
  }
}

function drawText(
  value,
  x,
  y,
  size = 12,
  align = 'left',
  alpha = 1
) {
  sceneCtx.save();

  const textScale = mobileSceneQuery.matches ? 1.35 : 1;

  sceneCtx.font =
    `${size * textScale}px VT323, "Courier New", monospace`;

  sceneCtx.textAlign = align;
  sceneCtx.textBaseline = 'alphabetic';

  sceneCtx.fillStyle = '#68e9dc';
  sceneCtx.globalAlpha = alpha;

  sceneCtx.shadowColor =
    'rgba(96,250,236,.22)';

  sceneCtx.shadowBlur = 1.8;

  sceneCtx.fillText(
    value,
    x,
    y
  );

  sceneCtx.restore();
}

function drawMultiline(
  value,
  x,
  y,
  size = 12,
  align = 'left',
  lineGap = 16
) {
  const textScale = mobileSceneQuery.matches ? 1.35 : 1;

  value.split('\n').forEach(
    (line, i) => {
      drawText(
        line,
        x,
        y + i * lineGap * textScale,
        size,
        align
      );
    }
  );
}

function drawTitle() {
  drawArt('eXit');

  drawMultiline(
    'recriação por Ace\nbaseado em Mr. Robot',
    20,
    23,
    10,
    'left',
    11
  );

  drawText(
    'pressione qualquer tecla para começar',
    SW / 2,
    mobileSceneQuery.matches ? SH - 72 : SH - 56,
    12,
    'center'
  );
}

function drawGame() {
  const s = STATES[state];

  if (!s) return;

  drawArt(s.art);

  const isMobile = mobileSceneQuery.matches;
  const textScale = isMobile ? 1.35 : 1;
  const bodyLineGap = 14;
  const commandY = isMobile ? SH - 20 : SH - 12;
  const bodyY = isMobile
    ? commandY - 28 - (s.body.split('\n').length - 1) * bodyLineGap * textScale
    : SH - 58;

  drawMultiline(
    s.body,
    SW / 2,
    bodyY,
    12,
    'center',
    bodyLineGap
  );

  const cursor =
    Math.floor(performance.now() / 500) % 2 === 0
      ? '_'
      : ' ';

  drawText(
    '> ' + input + cursor,
    SW / 2,
    commandY,
    12,
    'center'
  );

  /*
    Se o estado tiver "choices", mostramos
    todas as escolhas disponíveis.

    Isso é usado no "note":
      ir embora
      acender um fósforo
  */

  if (isMobile) {
    // No mobile hint row: the prompt itself is the only input interface.
  } else if (Array.isArray(s.choices)) {
    const labels = s.choices
      .map(choice => choice.accepts[0])
      .join('  |  ');

    drawText(
      'comandos: ' + labels,
      SW / 2,
      SH - 2,
      8.5,
      'center',
      0.46
    );
  } else if (state === 'barrel') {
    drawText(
      'comandos: mover o barril  |  sentar ao lado do meu amigo',
      SW / 2,
      SH - 2,
      8.5,
      'center',
      0.46
    );
  } else {
    const first =
      STATES[state]?.accepts?.[0];

    if (first) {
      drawText(
        'comando: ' + first,
        SW / 2,
        SH - 2,
        8.5,
        'center',
        0.42
      );
    }
  }

  if (noticeTimer > Date.now()) {
    drawText(
      notice,
      SW / 2,
      18,
      9,
      'center',
      0.82
    );
  }
}

function drawNewWorld() {
  drawArt('new_world');

  const isMobile = mobileSceneQuery.matches;

  drawText(
    'parabéns, você está a caminho de um novo mundo!',
    SW / 2,
    isMobile ? SH - 76 : SH - 43,
    11,
    'center'
  );

  drawText(
    'você quer jogar novamente? [sim / não]',
    SW / 2,
    isMobile ? SH - 48 : SH - 25,
    11,
    'center'
  );

  const cursor =
    Math.floor(performance.now() / 500) % 2 === 0
      ? '_'
      : ' ';

  drawText(
    '> ' + input + cursor,
    SW / 2,
    isMobile ? SH - 20 : SH - 10,
    11,
    'center'
  );
}

function drawShutdown(now) {
  sceneCtx.fillStyle = '#000';

  sceneCtx.fillRect(
    0,
    0,
    SW,
    SH
  );
}

/* ---------------------- ESTÁTICA CINZA BEM VISÍVEL ---------------------- */

let dustCanvas;
let dustCtx;

let dustTimer = 0;

let staticLines = [];

function setupDust() {
  dustCanvas = document.createElement('canvas');

  dustCanvas.width = 240;
  dustCanvas.height = 180;

  dustCtx = dustCanvas.getContext(
    '2d',
    {
      alpha: true
    }
  );

  staticLines =
    Array.from(
      {
        length: 22
      },
      () => ({
        y: Math.random() * 180,
        width: 15 + Math.random() * 110,
        alpha: 0.10 + Math.random() * 0.20
      })
    );

  dustEl.style.backgroundImage =
    `url(${dustCanvas.toDataURL()})`;

  dustEl.style.backgroundSize =
    '100% 100%';

  dustEl.style.backgroundRepeat =
    'no-repeat';
}

function paintDust(now) {
  if (
    !dustCtx ||
    now - dustTimer < 42
  ) {
    return;
  }

  dustTimer = now;

  const w = dustCanvas.width;
  const h = dustCanvas.height;

  const img =
    dustCtx.createImageData(
      w,
      h
    );

  const d = img.data;

  /*
    Ruído cinza.
  */

  for (
    let i = 0;
    i < d.length;
    i += 4
  ) {
    const n = Math.random();

    const visible =
      n > 0.90
        ? 1
        : (n > 0.72 ? 0.52 : 0.12);

    const v =
      Math.round(
        120 + Math.random() * 125
      );

    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;

    d[i + 3] =
      Math.round(
        255 *
        visible *
        (0.22 + Math.random() * 0.34)
      );
  }

  dustCtx.putImageData(
    img,
    0,
    0
  );

  dustCtx.fillStyle =
    'rgba(235,240,238,.26)';

  for (let i = 0; i < 520; i++) {
    const x =
      Math.floor(
        Math.random() * w
      );

    const y =
      Math.floor(
        Math.random() * h
      );

    const s =
      Math.random() < 0.97
        ? 1
        : 2;

    dustCtx.fillRect(
      x,
      y,
      s,
      s
    );
  }

  for (
    let i = 0;
    i < staticLines.length;
    i++
  ) {
    const line = staticLines[i];

    line.y +=
      (Math.random() - 0.5) * 2.5;

    if (line.y < 0) {
      line.y += h;
    }

    if (line.y >= h) {
      line.y -= h;
    }

    if (Math.random() < 0.13) {
      dustCtx.fillStyle =
        `rgba(220,228,226,${
          line.alpha +
          Math.random() * 0.14
        })`;

      dustCtx.fillRect(
        Math.random() *
          (w - line.width),
        Math.floor(line.y),
        line.width,
        1
      );
    }
  }

  dustEl.style.backgroundImage =
    `url(${dustCanvas.toDataURL('image/png')})`;
}

/* ------------------------------ WEBGL CRT ----------------------------- */

let gl;
let program;
let tex;
let posBuffer;
let texBuffer;

const vertexSrc = `
attribute vec2 a_pos;
attribute vec2 a_uv;

varying vec2 v_uv;

void main(){
  gl_Position =
    vec4(a_pos, 0.0, 1.0);

  v_uv = a_uv;
}
`;

const fragSrc = `
precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_tex;
uniform float u_time;
uniform float u_flicker;

float hash(vec2 p){
  return fract(
    sin(dot(
      p,
      vec2(
        127.1,
        311.7
      )
    )) *
    43758.5453123
  );
}

void main(){

  vec2 uv = v_uv;

  vec2 p =
    uv * 2.0 - 1.0;

  float r2 =
    dot(p, p);

  /*
    Curvatura CRT suave.
  */

  float k = 0.085;

  p *=
    1.0 +
    k * r2;

  p *= 0.965;

  uv =
    p * 0.5 + 0.5;

  if (
    uv.x < 0.0 ||
    uv.x > 1.0 ||
    uv.y < 0.0 ||
    uv.y > 1.0
  ) {

    gl_FragColor =
      vec4(
        0.0,
        0.0,
        0.0,
        1.0
      );

    return;
  }

  /*
    Pequena aberração cromática.
  */

  vec2 ca =
    vec2(0.0016, 0.0) *
    (
      0.30 +
      0.70 *
      clamp(
        r2,
        0.0,
        1.0
      )
    );

  float rr =
    texture2D(
      u_tex,
      uv + ca
    ).r;

  float gg =
    texture2D(
      u_tex,
      uv
    ).g;

  float bb =
    texture2D(
      u_tex,
      uv - ca
    ).b;

  vec3 c =
    vec3(
      rr,
      gg,
      bb
    );

  /*
    Scanlines.
  */

  float scan =
    0.935 +
    0.065 *
    sin(
      (
        uv.y * 360.0
      ) *
      3.14159265
    );

  c *= scan;

  /*
    Grain interno leve.
  */

  float grain =
    hash(
      floor(
        uv *
        vec2(
          480.0,
          360.0
        )
      ) +
      floor(
        u_time * 14.0
      )
    );

  c +=
    (grain - 0.5) *
    0.024;

  float flick =
    0.988 +
    0.012 *
    sin(
      u_time * 1.7
    ) +
    0.006 *
    sin(
      u_time * 9.0
    );

  c *=
    flick *
    u_flicker;

  /*
    Vinheta.
  */

  float edge =
    smoothstep(
      0.56,
      1.18,
      dot(p, p)
    );

  c *=
    1.0 -
    edge * 0.72;

  float lum =
    max(
      max(
        c.r,
        c.g
      ),
      c.b
    );

  c +=
    vec3(
      0.0,
      0.016,
      0.013
    ) *
    smoothstep(
      0.35,
      0.95,
      lum
    );

  gl_FragColor =
    vec4(
      max(c, 0.0),
      1.0
    );
}
`;

function makeShader(
  type,
  src
) {
  const s =
    gl.createShader(type);

  gl.shaderSource(
    s,
    src
  );

  gl.compileShader(s);

  if (
    !gl.getShaderParameter(
      s,
      gl.COMPILE_STATUS
    )
  ) {
    throw new Error(
      gl.getShaderInfoLog(s)
    );
  }

  return s;
}

function initCRT() {
  gl =
    screen.getContext(
      'webgl',
      {
        alpha: false,
        antialias: false
      }
    );

  if (!gl) {
    window._crt2d =
      screen.getContext(
        '2d',
        {
          alpha: false
        }
      );

    return;
  }

  const vs =
    makeShader(
      gl.VERTEX_SHADER,
      vertexSrc
    );

  const fs =
    makeShader(
      gl.FRAGMENT_SHADER,
      fragSrc
    );

  program =
    gl.createProgram();

  gl.attachShader(
    program,
    vs
  );

  gl.attachShader(
    program,
    fs
  );

  gl.linkProgram(program);

  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS
    )
  ) {
    throw new Error(
      gl.getProgramInfoLog(program)
    );
  }

  gl.useProgram(program);

  posBuffer =
    gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    posBuffer
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );

  const aPos =
    gl.getAttribLocation(
      program,
      'a_pos'
    );

  gl.enableVertexAttribArray(
    aPos
  );

  gl.vertexAttribPointer(
    aPos,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  texBuffer =
    gl.createBuffer();

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    texBuffer
  );

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]),
    gl.STATIC_DRAW
  );

  const aUV =
    gl.getAttribLocation(
      program,
      'a_uv'
    );

  gl.enableVertexAttribArray(
    aUV
  );

  gl.vertexAttribPointer(
    aUV,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  tex =
    gl.createTexture();

  gl.bindTexture(
    gl.TEXTURE_2D,
    tex
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
  );

  gl.bindTexture(
    gl.TEXTURE_2D,
    null
  );
}

function uploadAndDraw(now) {
  if (!gl) {
    const c =
      window._crt2d;

    c.imageSmoothingEnabled =
      true;

    c.fillStyle =
      '#000';

    c.fillRect(
      0,
      0,
      OUT_W,
      OUT_H
    );

    c.drawImage(
      scene,
      0,
      0,
      OUT_W,
      OUT_H
    );

    return;
  }

  gl.viewport(
    0,
    0,
    screen.width,
    screen.height
  );

  gl.clearColor(
    0,
    0,
    0,
    1
  );

  gl.clear(
    gl.COLOR_BUFFER_BIT
  );

  gl.useProgram(program);

  gl.activeTexture(
    gl.TEXTURE0
  );

  gl.bindTexture(
    gl.TEXTURE_2D,
    tex
  );

  gl.pixelStorei(
    gl.UNPACK_FLIP_Y_WEBGL,
    true
  );

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    scene
  );

  gl.uniform1i(
    gl.getUniformLocation(
      program,
      'u_tex'
    ),
    0
  );

  gl.uniform1f(
    gl.getUniformLocation(
      program,
      'u_time'
    ),
    now / 1000
  );

  gl.uniform1f(
    gl.getUniformLocation(
      program,
      'u_flicker'
    ),
    flicker
  );

  gl.drawArrays(
    gl.TRIANGLE_STRIP,
    0,
    4
  );
}

function frame(now) {
  if (!ready) {
    requestAnimationFrame(frame);
    return;
  }

  const dt =
    now - lastTime;

  lastTime = now;

  if (
    Math.random() < 0.018
  ) {
    flicker =
      0.945 +
      Math.random() * 0.035;
  } else {
    flicker +=
      (1 - flicker) *
      Math.min(
        1,
        dt / 70
      );
  }

  renderScene(now);

  uploadAndDraw(now);

  paintDust(now);

  requestAnimationFrame(frame);
}

function badCommand() {
  notice =
    state === 'barrel'
      ? 'você não pode fazer isso aqui.'
      : 'você não pode digitar isso aqui.';

  noticeTimer =
    Date.now() + 1200;
}

function cancelAudioFade(audio) {
  if (!audio) return;

  const frame = audioFadeFrames.get(audio);
  if (frame) window.cancelAnimationFrame(frame);
  audioFadeFrames.delete(audio);
}

function fadeAudioIn(audio, targetVolume, duration = 1800) {
  if (!audio) return;

  cancelAudioFade(audio);
  audio.volume = 0;
  const startedAt = performance.now();

  const step = now => {
    const progress = Math.min(1, (now - startedAt) / duration);
    audio.volume = targetVolume * progress;

    if (progress < 1) {
      audioFadeFrames.set(audio, requestAnimationFrame(step));
    } else {
      audioFadeFrames.delete(audio);
    }
  };

  const playback = audio.play();
  if (playback && typeof playback.catch === 'function') {
    playback.catch(() => {});
  }

  audioFadeFrames.set(audio, requestAnimationFrame(step));
}

function stopAudio(audio) {
  if (!audio) return;

  cancelAudioFade(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
}

function startAtmosphere() {
  if (!atmosphereAudio) {
    atmosphereAudio =
      new Audio('assets/oldcomputer.mp3');

    atmosphereAudio.loop = true;
    atmosphereAudio.volume = 0;
    atmosphereAudio.preload = 'auto';
  }

  /*
    Se o áudio já estiver tocando,
    não reinicia.
  */
  if (!atmosphereAudio.paused) {
    return;
  }

  atmosphereAudio.currentTime = 0;
  fadeAudioIn(atmosphereAudio, 0.35, 1600);
}


function stopAtmosphere() {
  if (!atmosphereAudio) {
    return;
  }

  stopAudio(atmosphereAudio);
}

function startGameMusic() {
  if (!gameMusic) {
    gameMusic = new Audio('../sounds/watchingstars.mp3');
    gameMusic.loop = true;
    gameMusic.preload = 'auto';
    gameMusic.volume = 0;
  }

  if (!gameMusic.paused) return;

  gameMusic.currentTime = 0;
  fadeAudioIn(gameMusic, 0.42, 2200);
}

function stopGameMusic() {
  stopAudio(gameMusic);
}

function startNoteMusic(nextState) {
  if (nextState === 'sit_friend' || nextState === 'note') {
    startGameMusic();
  }
}

function playStartClick() {
  const sound = new Audio('../sounds/mouseclick.mp3');
  sound.volume = 0.7;
  sound.play().catch(() => {});
}


function playTypeEffect() {
  const sound =
    new Audio('../sounds/typeffect.mp3');

  sound.volume = 0.45;

  sound.play().catch(err => {
    console.warn(
      'Não foi possível tocar typeffect.mp3:',
      err
    );
  });
}

function resetGame() {
  started = true;
  state = 'barrel';
  input = '';
  notice = '';
  noticeTimer = 0;
  endingText = '';
  endingStartedAt = 0;

  stopGameMusic();
  startAtmosphere();
}

function startShutdown() {
  state = 'shutdown';

  shutdownStartedAt =
    performance.now();

  shutdownFinished = true;

  stopAtmosphere();
  stopGameMusic();

  if (dustEl) {
    dustEl.style.opacity = '0';
  }

  try {
    if (!poweroffAudio) {
      poweroffAudio =
        new Audio(
          'assets/poweroff.mp3'
        );

      poweroffAudio.preload = 'auto';
    }

    poweroffAudio.currentTime = 0;

    const playPromise =
      poweroffAudio.play();

    if (
      playPromise &&
      typeof playPromise.catch === 'function'
    ) {
      playPromise.catch(err => {
        console.warn(
          'Não foi possível tocar poweroff.mp3:',
          err
        );
      });
    }

  } catch (err) {
    console.warn(
      'Não foi possível iniciar poweroff.mp3:',
      err
    );
  }
}

function submit() {
  const raw = input;

  const command =
    normalizeCommand(raw);

  input = '';

  if (!command) {
    return;
  }

  if (state === 'shutdown') {
    return;
  }

  if (!started) {
    resetGame();
    return;
  }

  /*
    Final da rota do barco.
  */
  if (state === 'new_world') {

    if (
      ['sim', 'yes', 's'].includes(command)
    ) {

      resetGame();

    } else if (
      ['nao', 'no', 'n'].includes(command)
    ) {

      started = false;
      state = 'title';
      input = '';
      stopAtmosphere();
      stopGameMusic();

    } else {

      notice =
        'digite sim ou não.';

      noticeTimer =
        Date.now() + 1200;
    }

    return;
  }

  /*
    Pega o estado atual.
  */
  const s =
    STATES[state];

  if (!s) {
    return;
  }

  /*
    ESTADOS COM DUAS OU MAIS ESCOLHAS.

    Atualmente o "note" possui:

      ir embora
        -> leave

      acender um fósforo
        -> light_note
  */
  if (Array.isArray(s.choices)) {

    for (const choice of s.choices) {

      const matches =
        choice.accepts.some(
          accepted =>
            commandMatches(
              command,
              accepted
            )
        );

      if (matches) {

        state =
          choice.next;

        startNoteMusic(state);

        /*
          Caso seja "ficar",
          o jogo vai DIRETO para o apagão.

          Não existe estado "stay" sendo renderizado.
        */
        if (state === 'stay') {
          startShutdown();
        }

        return;
      }
    }

    badCommand();
    return;
  }

  /*
    PRIMEIRA TELA.

    Permite:

      mover o barril

    OU

      sentar ao lado do meu amigo
  */
  if (state === 'barrel') {

    /*
      Rota do barril.
    */
    if (
      s.accepts.some(
        accepted =>
          commandMatches(
            command,
            accepted
          )
      )
    ) {

      state =
        s.next;

      return;
    }

    /*
      Rota do amigo.
    */
    if (
      s.altAccepts.some(
        accepted =>
          commandMatches(
            command,
            accepted
          )
      )
    ) {

      state =
        s.altNext;

      startNoteMusic(state);

      return;
    }

    badCommand();
    return;
  }

  /*
    ESTADOS COM APENAS UMA ESCOLHA.
  */
  if (
    !s.accepts.some(
      accepted =>
        commandMatches(
          command,
          accepted
        )
    )
  ) {

    badCommand();
    return;
  }

  /*
    Avança normalmente.
  */
  state =
    s.next;

  /*
    ESTE É O CASO "ficar".

    Em vez de deixar:
      state = 'stay'

    e quebrar o jogo,

    nós iniciamos imediatamente
    o desligamento.
  */
  if (state === 'stay') {
    startShutdown();
    return;
  }
}

function renderScene(now) {
  if (!ready) return;

  if (!started) {
    drawTitle();

  } else if (state === 'new_world') {
    drawNewWorld();

  } else if (state === 'shutdown') {
    drawShutdown(now);

  } else {
    drawGame();
  }
}

window.addEventListener(
  'keydown',
  e => {

    /*
      Tela de título:
      qualquer tecla inicia.
    */
    if (!started) {
      e.preventDefault();
      playTypeEffect();
      resetGame();
      return;
    }

    /*
      Depois que a tela desligou,
      nenhuma tecla faz o jogo continuar.
    */
    if (state === 'shutdown') {
      e.preventDefault();
      return;
    }

    /*
      ENTER = enviar comando
    */
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
      return;
    }

    /*
      BACKSPACE = apagar + som
    */
    if (e.key === 'Backspace') {

      if (input.length > 0) {
        input =
          input.slice(0, -1);

        playTypeEffect();
      }

      e.preventDefault();
      return;
    }

    /*
      ESCAPE = limpar tudo
    */
    if (e.key === 'Escape') {
      input = '';
      e.preventDefault();
      return;
    }

    /*
      DIGITAÇÃO NORMAL
    */
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {

      input +=
        e.key.toLowerCase();

      playTypeEffect();

      e.preventDefault();
      return;
    }
  }
);

window.addEventListener(
  'pointerdown',
  () => {
    if (!started) {
      playStartClick();
      resetGame();
    }
  }
);

setupMobileControls();

preload().catch(err => {
  console.error(err);

  document.body.innerHTML =
    '<pre style="color:#7ff7e7;padding:24px;font:16px monospace">' +
    'eXit não pôde iniciar. Verifique os nomes das imagens.' +
    '</pre>';
});

function setupMobileControls() {
  /*
    Cria os controles automaticamente,
    então você não precisa alterar o HTML.
  */

  mobileControls =
    document.createElement('div');

  mobileControls.id =
    'mobileControls';

  mobileControls.innerHTML = `
    <input
      id="mobileCommand"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="none"
      spellcheck="false"
      enterkeyhint="send"
      aria-label="Linha de comando do eXit"
    >
  `;

  (document.getElementById('game') || document.body).appendChild(
    mobileControls
  );

  mobileInput =
    document.getElementById(
      'mobileCommand'
    );

  mobileSend = null;

  /*
    Sempre que o usuário digitar,
    sincroniza com a variável "input"
    usada pelo jogo.
  */

  mobileInput.addEventListener(
  'input',
  () => {
    input =
      mobileInput.value.toLowerCase();

    playTypeEffect();
  }
);

  /*
    Botão de enviar.
  */

  /*
    Enter do teclado virtual.
  */

  mobileInput.addEventListener(
  'keydown',
  e => {
    /*
      Não deixa o evento subir para o
      listener global do teclado.
    */
    e.stopPropagation();

    /*
      ENTER = enviar comando
    */
    if (e.key === 'Enter') {
      e.preventDefault();

      input =
        mobileInput.value;

      mobileInput.value = '';

      submit();

      mobileInput.blur();

      return;
    }

    /*
      BACKSPACE = apagar + som
    */
    if (e.key === 'Backspace') {
      if (mobileInput.value.length > 0) {
        playTypeEffect();
      }

      /*
        NÃO damos preventDefault aqui.
        O navegador precisa apagar a letra
        normalmente do input.
      */
      return;
    }
  }
);

}

async function requestLandscape() {
  try {
    /*
      Primeiro tenta colocar em tela cheia.
      Isso aumenta a chance de o navegador
      aceitar o bloqueio de orientação.
    */
    if (
      document.documentElement.requestFullscreen &&
      !document.fullscreenElement
    ) {
      await document.documentElement
        .requestFullscreen();
    }
  } catch (err) {
    console.warn(
      'Fullscreen não disponível:',
      err
    );
  }

  try {
    if (
      screen.orientation &&
      screen.orientation.lock
    ) {
      await screen.orientation.lock(
        'landscape'
      );
    }
  } catch (err) {
    console.warn(
      'Bloqueio de orientação não disponível:',
      err
    );
  }
}
