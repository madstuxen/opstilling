/**
 * GuideFigure SVG renderer — matches ithem/components/GuideFigure/GuideFigure.tsx geometry.
 */
(function (global) {
  const GEO = {
    viewBoxWidth: 200,
    viewBoxHeight: 300,
    headRadius: 36,
    headCenterX: 70,
    headCenterY: 40,
    torsoWidth: 60,
    torsoHeight: 80,
    torsoX: 40,
    torsoY: 82,
    torsoRxTop: 30,
    torsoRyBottom: 20,
    torsoCenterX: 70,
    torsoCenterY: 122,
    armWidth: 50,
    armHeight: 18,
    armRadius: 9,
    shoulderLeftX: 49,
    shoulderLeftY: 91,
    shoulderRightX: 91,
    shoulderRightY: 91,
    thighWidth: 18,
    thighHeight: 55,
    shinWidth: 18,
    shinHeight: 50,
    legRadius: 9,
    hipLeftX: 52,
    hipLeftY: 152,
    hipRightX: 88,
    hipRightY: 152,
    elbowOffset: 42,
    kneeOffset: 42,
  };

  /** Dingle pivot — tuned above geometric head center (Y grows downward). */
  const DINGLE_PIVOT_X = GEO.headCenterX;
  const DINGLE_PIVOT_Y = 20;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value != null) node.setAttribute(key, String(value));
      });
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function g(id, parent) {
    return el('g', { id, 'data-joint': id }, parent);
  }

  function buildArm(side, parent, refs) {
    const isLeft = side === 'left';
    const prefix = isLeft ? 'left' : 'right';
    const xOffset = isLeft ? -GEO.armWidth + 8 : -8;
    const jointX = isLeft ? -GEO.elbowOffset + 8 : GEO.elbowOffset - 8;
    const segment2X = isLeft ? -GEO.armWidth + 8 : -8;
    const pivotX = isLeft ? GEO.shoulderLeftX : GEO.shoulderRightX;
    const pivotY = isLeft ? GEO.shoulderLeftY : GEO.shoulderRightY;

    const translate = g(`skulder_translate_${prefix}`, parent);
    const rotate = g(`skulder_rotate_${prefix}`, translate);
    el('rect', {
      x: xOffset,
      y: -GEO.armHeight / 2,
      width: GEO.armWidth,
      height: GEO.armHeight,
      rx: GEO.armRadius,
      ry: GEO.armRadius,
      class: 'figure-limb',
    }, rotate);
    g(`objekt_slot_skulder_${prefix}`, rotate);

    const elbowPivot = el('g', { transform: `translate(${jointX}, 0)` }, rotate);
    const elbowRotate = g(`albue_rotate_${prefix}`, elbowPivot);
    el('rect', {
      x: segment2X,
      y: -GEO.armHeight / 2,
      width: GEO.armWidth,
      height: GEO.armHeight,
      rx: GEO.armRadius,
      ry: GEO.armRadius,
      class: 'figure-limb',
    }, elbowRotate);
    g(`objekt_slot_albue_${prefix}`, elbowRotate);

    refs[`skulder_translate_${prefix}`] = translate;
    refs[`skulder_rotate_${prefix}`] = rotate;
    refs[`albue_rotate_${prefix}`] = elbowRotate;
    refs[`arm_${prefix}`] = translate;
    refs[`shoulderPivot_${prefix}`] = { x: pivotX, y: pivotY };
  }

  function buildLeg(side, parent, refs) {
    const isLeft = side === 'left';
    const prefix = isLeft ? 'left' : 'right';
    const pivotX = isLeft ? GEO.hipLeftX : GEO.hipRightX;
    const pivotY = isLeft ? GEO.hipLeftY : GEO.hipRightY;

    const translate = g(`hofte_translate_${prefix}`, parent);
    const rotate = g(`hofte_rotate_${prefix}`, translate);
    el('rect', {
      x: -GEO.thighWidth / 2,
      y: -4,
      width: GEO.thighWidth,
      height: GEO.thighHeight,
      rx: GEO.legRadius,
      ry: GEO.legRadius,
      class: 'figure-limb',
    }, rotate);
    g(`objekt_slot_hofte_${prefix}`, rotate);

    const kneePivot = el('g', { transform: `translate(0, ${GEO.kneeOffset})` }, rotate);
    const kneeRotate = g(`knae_rotate_${prefix}`, kneePivot);
    el('rect', {
      x: -GEO.shinWidth / 2,
      y: -4,
      width: GEO.shinWidth,
      height: GEO.shinHeight,
      rx: GEO.legRadius,
      ry: GEO.legRadius,
      class: 'figure-limb',
    }, kneeRotate);
    g(`objekt_slot_knae_${prefix}`, kneeRotate);

    refs[`hofte_translate_${prefix}`] = translate;
    refs[`hofte_rotate_${prefix}`] = rotate;
    refs[`knae_rotate_${prefix}`] = kneeRotate;
    refs[`hipPivot_${prefix}`] = { x: pivotX, y: pivotY };
  }

  function createFigureSvg(options = {}) {
    const refs = {};
    const svg = el('svg', {
      class: options.className || 'figure-svg',
      viewBox: `0 0 ${GEO.viewBoxWidth} ${GEO.viewBoxHeight}`,
      xmlns: SVG_NS,
    });

    const root = g('figure_root', svg);
    refs.figureRoot = root;
    refs.objektFreeBack = g('objekt_free_back', root);
    refs.maveLayer = g('mave_layer', root);

    const torsoContent = g('torso_content', refs.maveLayer);
    refs.torsoContent = torsoContent;
    refs.armsBack = g('arms_back', torsoContent);
    refs.legs = g('legs', torsoContent);
    refs.objektBack = g('objekt_back', torsoContent);

    refs.torso = el('rect', {
      id: 'figure_torso',
      x: GEO.torsoX,
      y: GEO.torsoY,
      width: GEO.torsoWidth,
      height: GEO.torsoHeight,
      rx: GEO.torsoRxTop,
      ry: GEO.torsoRyBottom,
      class: 'figure-body',
    }, torsoContent);

    refs.objektFront = g('objekt_front', torsoContent);

    buildArm('left', refs.armsBack, refs);
    buildArm('right', refs.armsBack, refs);
    buildLeg('left', refs.legs, refs);
    buildLeg('right', refs.legs, refs);

    refs.headGroup = g('head_group', refs.maveLayer);
    refs.head = el('circle', {
      id: 'figure_head',
      cx: GEO.headCenterX,
      cy: GEO.headCenterY,
      r: GEO.headRadius,
      class: 'figure-body',
    }, refs.headGroup);

    refs.headLabelLayer = g('head_label_layer', refs.headGroup);
    refs.headText = el('text', {
      id: 'figure_head_text',
      class: 'figure-head-text',
    }, refs.headLabelLayer);

    /** Front arms after torso + head (matches ithem GuideFigure paint order). */
    refs.armsFront = g('arms_front', refs.maveLayer);

    refs.objektMaveFront = g('objekt_mave_front', refs.maveLayer);

    refs.objektRoot = g('objekt_root', refs.objektFront);

    refs.objektFreeFront = g('objekt_free_front', root);
    refs.objektOrigin = el('circle', {
      id: 'objekt_origin_marker',
      cx: GEO.torsoCenterX,
      cy: GEO.torsoCenterY,
      r: 3,
      fill: '#8b5cf6',
      opacity: 0.75,
      class: 'objekt-origin-marker',
      style: 'display: none',
      'pointer-events': 'none',
    }, root);

    /** Dingle / bodyRotation pivot — see DINGLE_PIVOT_X/Y (above head center by headRadius/4). */
    refs.dinglePivotMarker = el('g', {
      id: 'dingle_pivot_marker',
      class: 'dingle-pivot-marker',
      'pointer-events': 'none',
      style: 'display: none',
    }, root);
    el('circle', {
      cx: DINGLE_PIVOT_X,
      cy: DINGLE_PIVOT_Y,
      r: 4,
      fill: '#ef4444',
      opacity: 0.45,
    }, refs.dinglePivotMarker);
    el('line', {
      x1: DINGLE_PIVOT_X - 6,
      y1: DINGLE_PIVOT_Y,
      x2: DINGLE_PIVOT_X + 6,
      y2: DINGLE_PIVOT_Y,
      stroke: '#ef4444',
      'stroke-width': 1.5,
      opacity: 0.65,
      'stroke-linecap': 'round',
    }, refs.dinglePivotMarker);
    el('line', {
      x1: DINGLE_PIVOT_X,
      y1: DINGLE_PIVOT_Y - 6,
      x2: DINGLE_PIVOT_X,
      y2: DINGLE_PIVOT_Y + 6,
      stroke: '#ef4444',
      'stroke-width': 1.5,
      opacity: 0.65,
      'stroke-linecap': 'round',
    }, refs.dinglePivotMarker);

    refs.svg = svg;
    svg._guideFigureRefs = refs;
    return { svg, refs, geo: GEO };
  }

  function splitHeadLabel(text, maxCharsPerLine = 8, maxLines = 3) {
    if (text == null || String(text).trim() === '') return [];
    const value = String(text);
    if (value.length <= maxCharsPerLine) return [value];

    const words = value.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (lines.length >= maxLines) break;
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (`${currentLine} ${word}`.length <= maxCharsPerLine) {
        currentLine += ` ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine.length > 0 && lines.length < maxLines) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [value.slice(0, maxCharsPerLine)];
  }

  function ensureHeadTextOnTop(refs) {
    if (refs.headLabelLayer?.parentNode) {
      refs.headLabelLayer.parentNode.appendChild(refs.headLabelLayer);
    }
  }

  function applyHeadText(refs, text, headTextColor) {
    if (!refs?.headText) return;
    const color = headTextColor || refs._headTextColor || '#ffffff';
    refs._headTextColor = color;
    refs._headTextValue = text;

    const lines = splitHeadLabel(text);
    const fontSize = 11;
    const lineHeight = fontSize * 1.1;
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = GEO.headCenterY - totalHeight / 2;

    refs.headText.setAttribute('fill', color);
    refs.headText.setAttribute('font-size', String(fontSize));
    refs.headText.setAttribute('font-weight', 'bold');
    refs.headText.textContent = '';

    if (lines.length === 0) {
      ensureHeadTextOnTop(refs);
      return;
    }

    lines.forEach((line, index) => {
      const tspan = el('tspan', {
        x: GEO.headCenterX,
        y: index === 0 ? startY : undefined,
        dy: index === 0 ? 0 : lineHeight,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      tspan.textContent = line;
      refs.headText.appendChild(tspan);
    });

    ensureHeadTextOnTop(refs);
  }

  function setTransform(node, tx, ty, rot) {
    if (!node) return;
    const parts = [];
    if (tx || ty) parts.push(`translate(${tx} ${ty})`);
    if (rot) parts.push(`rotate(${rot})`);
    node.setAttribute('transform', parts.join(' ') || '');
    node.style.transform = '';
  }

  /** Shortest arc for degrees — matches ithem poseUtils.lerpRotation. */
  function lerpRotation(from, to, t) {
    let delta = to - from;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return from + delta * t;
  }

  /** Navle / mave pivot — torsoCenter; origin for objekt_parent === "mave". */
  const NAVLE_PIVOT_X = GEO.torsoCenterX;
  const NAVLE_PIVOT_Y = GEO.torsoCenterY;

  function applyMaveTransform(refs, pose) {
    if (!refs?.maveLayer) return;
    const px = NAVLE_PIVOT_X;
    const py = NAVLE_PIVOT_Y;
    const tx = pose.mave_translate_x || 0;
    const ty = pose.mave_translate_y || 0;
    const rot = pose.mave_rotate || 0;
    refs.maveLayer.setAttribute(
      'transform',
      `translate(${px + tx} ${py + ty}) rotate(${rot}) translate(${-px} ${-py})`,
    );
  }

  function applyHeadTransform(refs, pose) {
    if (!refs?.headGroup) return;
    const tx = pose.hoved_translate_x || 0;
    const ty = pose.hoved_translate_y || 0;
    refs.headGroup.setAttribute('transform', tx || ty ? `translate(${tx} ${ty})` : '');
  }

  function applyArmFrontOrder(refs, leftFront, rightFront) {
    const moveArm = (side, toFront) => {
      const key = `arm_${side}`;
      const node = refs[key];
      const target = toFront ? refs.armsFront : refs.armsBack;
      if (node && node.parentNode !== target) target.appendChild(node);
    };
    moveArm('left', leftFront);
    moveArm('right', rightFront);
    ensureHeadTextOnTop(refs);
  }

  function applyPoseToFigure(refs, pose) {
    const p = pose || {};

    setTransform(
      refs.skulder_translate_left,
      (p.translate_x_left || 0) + GEO.shoulderLeftX,
      (p.translate_y_left || 0) + GEO.shoulderLeftY,
      0,
    );
    setTransform(refs.skulder_rotate_left, 0, 0, p.skulder_rot_left || 0);
    setTransform(refs.albue_rotate_left, 0, 0, p.albue_rot_left || 0);

    setTransform(
      refs.skulder_translate_right,
      (p.translate_x || 0) + GEO.shoulderRightX,
      (p.translate_y || 0) + GEO.shoulderRightY,
      0,
    );
    setTransform(refs.skulder_rotate_right, 0, 0, p.skulder_rot || 0);
    setTransform(refs.albue_rotate_right, 0, 0, p.albue_rot || 0);

    setTransform(
      refs.hofte_translate_left,
      (p.translate_x_left_leg || 0) + GEO.hipLeftX,
      (p.translate_y_left_leg || 0) + GEO.hipLeftY,
      0,
    );
    setTransform(refs.hofte_rotate_left, 0, 0, p.hofte_rot_left || 0);
    setTransform(refs.knae_rotate_left, 0, 0, p.knae_rot_left || 0);

    setTransform(
      refs.hofte_translate_right,
      (p.translate_x_right_leg || 0) + GEO.hipRightX,
      (p.translate_y_right_leg || 0) + GEO.hipRightY,
      0,
    );
    setTransform(refs.hofte_rotate_right, 0, 0, p.hofte_rot_right || 0);
    setTransform(refs.knae_rotate_right, 0, 0, p.knae_rot_right || 0);

    applyArmFrontOrder(refs, !!p.left_arm_front, !!p.right_arm_front);

    applyMaveTransform(refs, p);
    applyHeadTransform(refs, p);
    applyHeadText(refs, p.head_text, refs._headTextColor);
  }

  function applyFigureColors(svg, bodyColor, headTextColor) {
    const limbColor = darkenColor(bodyColor, 0.15);
    svg.querySelectorAll('.figure-body').forEach((node) => node.setAttribute('fill', bodyColor));
    svg.querySelectorAll('.figure-limb').forEach((node) => node.setAttribute('fill', limbColor));
    const refs = svg._guideFigureRefs;
    if (refs) {
      applyHeadText(refs, refs._headTextValue, headTextColor);
      return;
    }
    const headText = svg.querySelector('.figure-head-text');
    if (headText && headTextColor) headText.setAttribute('fill', headTextColor);
  }

  function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const newR = Math.max(0, Math.floor(r * (1 - percent)));
    const newG = Math.max(0, Math.floor(g * (1 - percent)));
    const newB = Math.max(0, Math.floor(b * (1 - percent)));
    return `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`;
  }

  function svgPointToScreen(svg, x, y) {
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const screen = pt.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  }

  function screenToSvgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  /**
   * Map a point in torso_content / figure-content space through #mave_layer
   * (same math as applyMaveTransform) into SVG user coordinates.
   */
  function contentPointToSvgUser(pose, x, y) {
    const px = NAVLE_PIVOT_X;
    const py = NAVLE_PIVOT_Y;
    const tx = pose?.mave_translate_x || 0;
    const ty = pose?.mave_translate_y || 0;
    const rot = ((pose?.mave_rotate || 0) * Math.PI) / 180;
    const dx = x - px;
    const dy = y - py;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    return {
      x: px + tx + dx * cos - dy * sin,
      y: py + ty + dx * sin + dy * cos,
    };
  }

  /** Inverse of contentPointToSvgUser — SVG user coords → figure-content coords. */
  function svgUserToContentPoint(pose, svgX, svgY) {
    const px = NAVLE_PIVOT_X;
    const py = NAVLE_PIVOT_Y;
    const tx = pose?.mave_translate_x || 0;
    const ty = pose?.mave_translate_y || 0;
    const rot = (-(pose?.mave_rotate || 0) * Math.PI) / 180;
    const cx = px + tx;
    const cy = py + ty;
    const dx = svgX - cx;
    const dy = svgY - cy;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    return {
      x: px + dx * cos - dy * sin,
      y: py + dx * sin + dy * cos,
    };
  }

  function screenToContentPoint(svg, pose, clientX, clientY) {
    const svgPt = screenToSvgPoint(svg, clientX, clientY);
    return svgUserToContentPoint(pose, svgPt.x, svgPt.y);
  }

  function contentPointToContainerLocal(svg, pose, contentX, contentY) {
    const svgPt = contentPointToSvgUser(pose, contentX, contentY);
    return svgToContainerLocal(svg, svgPt.x, svgPt.y);
  }

  function svgUserPointToContainerLocal(svg, svgX, svgY) {
    return svgToContainerLocal(svg, svgX, svgY);
  }

  /** Origin of an SVG element (local 0,0) in .figure-container pixel coords. */
  function elementOriginToContainerLocal(svg, element) {
    if (!element) return null;
    const figurePt = elementLocalToFigure(svg, element, 0, 0);
    return svgToContainerLocal(svg, figurePt.x, figurePt.y);
  }

  function screenToElementLocal(element, clientX, clientY) {
    if (!element) return { x: 0, y: 0 };
    const pt = element.ownerSVGElement?.createSVGPoint?.() || { x: clientX, y: clientY };
    pt.x = clientX;
    pt.y = clientY;
    const ctm = element.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function cssAngleToVector(deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  function getArmSegmentLengths() {
    return {
      upper: GEO.elbowOffset - 8,
      forearm: GEO.armWidth - 8,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getShoulderPos(side, pose) {
    const isLeft = side === 'left';
    const p = pose || {};
    return {
      x: (isLeft ? GEO.shoulderLeftX : GEO.shoulderRightX) + (isLeft ? p.translate_x_left || 0 : p.translate_x || 0),
      y: (isLeft ? GEO.shoulderLeftY : GEO.shoulderRightY) + (isLeft ? p.translate_y_left || 0 : p.translate_y || 0),
    };
  }

  function getHipPos(side, pose) {
    const isLeft = side === 'left';
    const p = pose || {};
    return {
      x: (isLeft ? GEO.hipLeftX : GEO.hipRightX) + (isLeft ? p.translate_x_left_leg || 0 : p.translate_x_right_leg || 0),
      y: (isLeft ? GEO.hipLeftY : GEO.hipRightY) + (isLeft ? p.translate_y_left_leg || 0 : p.translate_y_right_leg || 0),
    };
  }

  function getHandPos(side, pose) {
    const shoulder = getShoulderPos(side, pose);
    const isLeft = side === 'left';
    const p = pose || {};
    const skulderRot = isLeft ? p.skulder_rot_left || 0 : p.skulder_rot || 0;
    const albueRot = isLeft ? p.albue_rot_left || 0 : p.albue_rot || 0;
    const { upper: upperLen, forearm: forearmLen } = getArmSegmentLengths();
    const sign = isLeft ? -1 : 1;
    const upperDir = cssAngleToVector(skulderRot);
    const elbowX = shoulder.x + sign * upperLen * upperDir.x;
    const elbowY = shoulder.y + sign * upperLen * upperDir.y;
    const forearmDir = cssAngleToVector(skulderRot + albueRot);
    return {
      x: elbowX + sign * forearmLen * forearmDir.x,
      y: elbowY + sign * forearmLen * forearmDir.y,
    };
  }

  function getFootPos(side, pose) {
    const hip = getHipPos(side, pose);
    const isLeft = side === 'left';
    const hofteRot = isLeft ? pose.hofte_rot_left || 0 : pose.hofte_rot_right || 0;
    const knaeRot = isLeft ? pose.knae_rot_left || 0 : pose.knae_rot_right || 0;
    const upperDir = cssAngleToVector(hofteRot + 90);
    const kneeX = hip.x + GEO.thighHeight * upperDir.x;
    const kneeY = hip.y + GEO.thighHeight * upperDir.y;
    const lowerDir = cssAngleToVector(hofteRot + 90 + knaeRot);
    return {
      x: kneeX + GEO.shinHeight * lowerDir.x,
      y: kneeY + GEO.shinHeight * lowerDir.y,
    };
  }

  function solveArmIK(side, targetX, targetY, flipSign, pose) {
    const shoulderPos = getShoulderPos(side, pose || {});
    const { upper: L1, forearm: L2 } = getArmSegmentLengths();
    const maxReach = L1 + L2;
    const isLeft = side === 'left';
    const elbowSign = flipSign ? -1 : 1;

    let outTargetX = targetX;
    let outTargetY = targetY;
    let dx = outTargetX - shoulderPos.x;
    let dy = outTargetY - shoulderPos.y;
    let dist = Math.hypot(dx, dy);

    if (dist > maxReach) {
      dist = maxReach - 0.001;
      const scale = dist / Math.hypot(dx, dy);
      dx *= scale;
      dy *= scale;
      outTargetX = shoulderPos.x + dx;
      outTargetY = shoulderPos.y + dy;
    }
    if (dist < 0.001) {
      dist = 0.001;
      dx = dist;
      dy = 0;
      outTargetX = shoulderPos.x + dx;
      outTargetY = shoulderPos.y + dy;
    }

    let ikTargetX = outTargetX;
    let ikTargetY = outTargetY;
    if (isLeft) {
      ikTargetX = 2 * shoulderPos.x - outTargetX;
      ikTargetY = 2 * shoulderPos.y - outTargetY;
    }

    dx = ikTargetX - shoulderPos.x;
    dy = ikTargetY - shoulderPos.y;
    dist = Math.hypot(dx, dy);

    const baseAngle = Math.atan2(dy, dx);
    const cosShoulder = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
    const cosElbow = clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1);
    const shoulderOffset = Math.acos(cosShoulder);
    const elbowBend = Math.PI - Math.acos(cosElbow);

    const candidates = [
      {
        skulder: baseAngle + elbowSign * shoulderOffset,
        albue: -elbowSign * elbowBend,
      },
      {
        skulder: baseAngle - elbowSign * shoulderOffset,
        albue: elbowSign * elbowBend,
      },
    ];

    // Flip vælger gren (albue op/ned) — undgå at hoppe mellem to lige gyldige løsninger.
    const chosen = candidates[0];

    let skulder = Math.round((chosen.skulder * 180) / Math.PI);
    let albue = Math.round((chosen.albue * 180) / Math.PI);
    skulder = clamp(skulder, -180, 180);
    albue = clamp(albue, -175, 175);

    if (isLeft) {
      return { skulder_rot_left: skulder, albue_rot_left: albue, targetX: outTargetX, targetY: outTargetY };
    }
    return { skulder_rot: skulder, albue_rot: albue, targetX: outTargetX, targetY: outTargetY };
  }

  function solveLegIK(hip, targetX, targetY, flipSign) {
    const legLen = GEO.thighHeight;
    const target = { x: targetX, y: targetY };
    const dx = target.x - hip.x;
    const dy = target.y - hip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.max(1, Math.min(dist, legLen * 2));

    if (dist > legLen * 2) {
      const scale = (legLen * 2 - 0.001) / dist;
      target.x = hip.x + dx * scale;
      target.y = hip.y + dy * scale;
    }

    const baseAngle = Math.atan2(target.y - hip.y, target.x - hip.x);
    const halfAngle = Math.acos(Math.max(-1, Math.min(1, clampedDist / (2 * legLen))));
    const sign = flipSign ? 1 : -1;
    const a1 = baseAngle + sign * halfAngle;

    const kneeX = hip.x + Math.cos(a1) * legLen;
    const kneeY = hip.y + Math.sin(a1) * legLen;
    const a2world = Math.atan2(target.y - kneeY, target.x - kneeX);
    let a2rel = a2world - a1;
    while (a2rel > Math.PI) a2rel -= 2 * Math.PI;
    while (a2rel < -Math.PI) a2rel += 2 * Math.PI;

    let hofte = (a1 * 180) / Math.PI - 90;
    while (hofte > 180) hofte -= 360;
    while (hofte < -180) hofte += 360;

    let knae = (a2rel * 180) / Math.PI;
    while (knae > 180) knae -= 360;
    while (knae < -180) knae += 360;
    knae = Math.max(-180, Math.min(180, knae));

    return { hofte_rot: hofte, knae_rot: knae, targetX: target.x, targetY: target.y };
  }

  function svgToContainerLocal(svg, svgX, svgY) {
    const container = svg.closest('.figure-container');
    if (!container) return { x: svgX, y: svgY };
    const containerRect = container.getBoundingClientRect();
    const screen = svgPointToScreen(svg, svgX, svgY);
    return { x: screen.x - containerRect.left, y: screen.y - containerRect.top };
  }

  function containerLocalToSvg(svg, localX, localY) {
    const container = svg.closest('.figure-container');
    if (!container) return { x: localX, y: localY };
    const containerRect = container.getBoundingClientRect();
    return screenToSvgPoint(svg, containerRect.left + localX, containerRect.top + localY);
  }

  function elementLocalToFigure(svg, element, localX, localY) {
    if (!element) return { x: localX, y: localY };
    const pt = svg.createSVGPoint();
    pt.x = localX;
    pt.y = localY;
    const elCTM = element.getScreenCTM();
    const svgCTM = svg.getScreenCTM();
    if (!elCTM || !svgCTM) return { x: localX, y: localY };
    const screen = pt.matrixTransform(elCTM);
    pt.x = screen.x;
    pt.y = screen.y;
    return pt.matrixTransform(svgCTM.inverse());
  }

  function getObjektPivotFigureCoords(svg, refs, pose) {
    const parentKey = pose.objekt_parent || '';
    const x = pose.objekt_x || 0;
    const y = pose.objekt_y || 0;

    if (parentKey === OBJEKT_PARENT_MAVE) {
      return contentPointToSvgUser(pose, GEO.torsoCenterX + x, GEO.torsoCenterY + y);
    }

    if (!parentKey) {
      return { x: GEO.torsoCenterX + x, y: GEO.torsoCenterY + y };
    }

    const slotId = OBJEKT_PARENT_SLOTS[parentKey];
    const slot = slotId ? svg.querySelector(`#${slotId}`) : null;
    return elementLocalToFigure(svg, slot, x, y);
  }

  let readPoseFromSliders = null;
  function setPoseReader(fn) {
    readPoseFromSliders = fn;
  }

  const OBJEKT_PARENT_MAVE = 'mave';

  const OBJEKT_PARENT_SLOTS = {
    skulder_right: 'objekt_slot_skulder_right',
    skulder_left: 'objekt_slot_skulder_left',
    albue_right: 'objekt_slot_albue_right',
    albue_left: 'objekt_slot_albue_left',
    hofte_right: 'objekt_slot_hofte_right',
    hofte_left: 'objekt_slot_hofte_left',
    knae_right: 'objekt_slot_knae_right',
    knae_left: 'objekt_slot_knae_left',
  };

  function getDefaultExportBoundary() {
    const armReach = (GEO.elbowOffset - 8) + (GEO.armWidth - 8);
    const legReach = GEO.thighHeight + GEO.shinHeight;
    const maxTranslate = 30;
    const padLeft = armReach + maxTranslate;
    const padRight = 48;
    const padTop = GEO.headRadius + 16;
    const padBottom = Math.max(48, legReach + maxTranslate - (GEO.viewBoxHeight - GEO.hipLeftY) + 16);
    const padX = Math.max(padLeft, padRight);
    const padY = Math.max(padTop, padBottom);
    // Figure sits left of viewBox center (torso/head at x≈70); shift content left so figure centers in export.
    const figureViewBoxOffsetX = GEO.viewBoxWidth / 2 - GEO.torsoCenterX;
    return {
      width: GEO.viewBoxWidth + padX * 2,
      height: GEO.viewBoxHeight + padY * 2,
      offsetX: padX + figureViewBoxOffsetX,
      offsetY: padY,
    };
  }

  global.GuideFigureRenderer = {
    GEO,
    DINGLE_PIVOT_X,
    DINGLE_PIVOT_Y,
    NAVLE_PIVOT_X,
    NAVLE_PIVOT_Y,
    lerpRotation,
    contentPointToSvgUser,
    svgUserToContentPoint,
    screenToContentPoint,
    contentPointToContainerLocal,
    svgUserPointToContainerLocal,
    elementOriginToContainerLocal,
    screenToElementLocal,
    createFigureSvg,
    applyPoseToFigure,
    applyMaveTransform,
    applyHeadTransform,
    applyFigureColors,
    applyHeadText,
    applyArmFrontOrder,
    svgPointToScreen,
    screenToSvgPoint,
    getShoulderPos,
    getHipPos,
    getHandPos,
    getFootPos,
    solveArmIK,
    solveLegIK,
    setPoseReader,
    svgToContainerLocal,
    containerLocalToSvg,
    elementLocalToFigure,
    getObjektPivotFigureCoords,
    getDefaultExportBoundary,
    OBJEKT_PARENT_MAVE,
    OBJEKT_PARENT_SLOTS,
    darkenColor,
  };
})(typeof window !== 'undefined' ? window : globalThis);
