import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { EngineView } from '../components/engine-view';
import { defaults } from '../lib/engine';
const cards = [
  { angle: 90, compression: 10 },
  { angle: 360, compression: 14 },
  { angle: 375, compression: 10 },
  { angle: 630, compression: 10 },
];
const views = cards
  .map(
    ({ angle, compression }, i) =>
      `<g transform="translate(${(i % 2) * 690} ${Math.floor(i / 2) * 630})"><rect width="690" height="630" fill="#121a23"/><text x="20" y="25" fill="white" font-size="18">${angle}° · ${compression}:1</text><g transform="translate(0 30)">${renderToStaticMarkup(
        <EngineView
          angle={angle}
          params={{ ...defaults, compression }}
          labels
          timing={false}
          selected={null}
          onSelect={() => {}}
        />,
      )
        .replace(
          '<svg ',
          '<svg width="690" height="590" font-family="Arial, sans-serif" ',
        )
        .replace(/id="([^"]+)"/g, `id="$1-${i}"`)
        .replace(/url\(#([^)]+)\)/g, `url(#$1-${i})`)}</g></g>`,
  )
  .join('');
writeFileSync(
  '/tmp/motorlab-engine-check.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="1380" height="1260">${views}</svg>`,
);
