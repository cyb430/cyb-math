'use strict';

function restoreBounds(saved, displays) {
  const primary = displays[0].workArea;
  const bounds = saved?.bounds;
  const valid = bounds && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]));
  const display = valid && displays.find(({ workArea: a }) => bounds.x + bounds.width > a.x && bounds.y + bounds.height > a.y && bounds.x < a.x + a.width && bounds.y < a.y + a.height);
  const area = display ? display.workArea : primary;
  const width = Math.min(area.width, Math.max(640, valid ? bounds.width : 1280));
  const height = Math.min(area.height, Math.max(480, valid ? bounds.height : 840));
  const x = display ? Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)) : area.x + Math.round((area.width - width) / 2);
  const y = display ? Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) : area.y + Math.round((area.height - height) / 2);
  return { x, y, width, height };
}

module.exports = { restoreBounds };
