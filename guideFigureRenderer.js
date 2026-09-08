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
    refs.armsBack = g('arms_back', root);
    refs.legs = g('legs', root);
    refs.objektBack = g('objekt_back', root);

    refs.torso = el('rect', {
      id: 'figure_torso',
      x: GEO.torsoX,
      y: GEO.torsoY,
      width: GEO.torsoWidth,
      height: GEO.torsoHeight,
      rx: GEO.torsoRxTop,
      ry: GEO.torsoRyBottom,
      class: 'figure-body',
    }, root);

    refs.head = el('circle', {
      id: 'figure_head',
      cx: GEO.headCenterX,
      cy: GEO.headCenterY,
      r: GEO.headRadius,
      class: 'figure-body',
    }, root);

    refs.headText = el('text', {
      id: 'figure_head_text',
      x: GEO.headCenterX,
      y: GEO.headCenterY,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      class: 'figure-head-text',
    }, root);

    refs.objektFront = g('objekt_front', root);
    refs.armsFront = g('arms_front', root);

    refs.objektOrigin = el('circle', {
      id: 'objekt_origin_marker',
      cx: GEO.torsoCenterX,
      cy: GEO.torsoCenterY,
      r: 3,
      fill: '#8b5cf6',
      opacity: 0.75,
      class: 'objekt-origin-marker',
      style: 'display: none',
    }, root);

    buildArm('left', refs.armsBack, refs);
    buildArm('right', refs.armsBack, refs);
    buildLeg('left', refs.legs, refs);
    buildLeg('right', refs.legs, refs);

    refs.objektRoot = g('objekt_root', refs.objektFront);
    refs.svg = svg;
    return { svg, refs, geo: GEO };
  }

  function setTransform(node, tx, ty, rot) {
    if (!node) return;
    const parts = [];
    if (tx || ty) parts.push(`translate(${tx} ${ty})`);
    if (rot) parts.push(`rotate(${rot})`);
    node.setAttribute('transform', parts.join(' ') || '');
    node.style.transform = '';
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

    if (refs.headText) {
      refs.headText.textContent = p.head_text != null && p.head_text !== '' ? p.head_text : 'Hoved';
    }
  }

  function applyFigureColors(svg, bodyColor, headTextColor) {
    const limbColor = darkenColor(bodyColor, 0.15);
    svg.querySelectorAll('.figure-body').forEach((node) => node.setAttribute('fill', bodyColor));
    svg.querySelectorAll('.figure-limb').forEach((node) => node.setAttribute('fill', limbColor));
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
    createFigureSvg,
    applyPoseToFigure,
    applyFigureColors,
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
    OBJEKT_PARENT_SLOTS,
    darkenColor,
  };
})(typeof window !== 'undefined' ? window : globalThis);
