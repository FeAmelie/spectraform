import { seedToken } from "./config.ts";

export function createSyntheticSvg(seed: number): string {
  const token = seedToken(seed);
  const offset = (Number.parseInt(token.slice(-2), 16) % 24) + 8;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img">',
    `  <title>Synthetic fixture ${token}</title>`,
    `  <rect x="${offset}" y="${offset}" width="${128 - offset * 2}" height="${128 - offset * 2}" rx="16" fill="#7049ff"/>`,
    '  <circle cx="64" cy="64" r="24" fill="#f3f0ff"/>',
    "</svg>",
    "",
  ].join("\n");
}

export function createDangerousSyntheticSvg(seed: number): string {
  const token = seedToken(seed);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" onload="fixtureHandler()">',
    `  <title>Dangerous synthetic fixture ${token}</title>`,
    '  <script>throw new Error("synthetic fixture must be rejected")</script>',
    '  <image href="https://example.invalid/fixture.svg" width="16" height="16"/>',
    "</svg>",
    "",
  ].join("\n");
}
