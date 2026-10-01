// Run with `npm test` (builds first). These pin the request each tool sends,
// because the API only reads `colors`, `preferences`, `accessibility`,
// `formats` and `audit_all_combinations`, and ignores everything else.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TOOLS, buildRequest, PREFERENCE_VALUES, DEFAULT_SEED_COLOR } from '../dist/tools.js';

const names = TOOLS.map((t) => t.name);

test('ten tools, named for what the API actually does', () => {
  assert.deepEqual(names, [
    'harmony_generate_palette',
    'duet_pair_fonts',
    'tempo_generate_scale',
    'chord_generate_shadows',
    'cadence_generate_grid',
    'riff_generate_motion',
    'bridge_generate_theme',
    'pitch_audit_contrast',
    'compose_export',
    'a11y_validate',
  ]);
  for (const t of TOOLS) {
    assert.equal(t.inputSchema.type, 'object', t.name);
    assert.ok(t.description.length > 40, `${t.name} has a real description`);
  }
});

test('every schema enum is one the API accepts', () => {
  assert.deepEqual(PREFERENCE_VALUES.color_scheme, ['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary']);
  assert.deepEqual(PREFERENCE_VALUES.type_style, ['modern', 'classical', 'minimalist', 'expressive']);
  assert.deepEqual(PREFERENCE_VALUES.density, ['compact', 'balanced', 'airy']);
  assert.deepEqual(PREFERENCE_VALUES.corners, ['sharp', 'rounded', 'pill']);
  assert.deepEqual(PREFERENCE_VALUES.shadow_intensity, ['flat', 'subtle', 'pronounced', 'dramatic']);
  assert.deepEqual(PREFERENCE_VALUES.animation_style, ['none', 'minimal', 'fluid', 'energetic']);
  const harmony = TOOLS.find((t) => t.name === 'harmony_generate_palette');
  assert.deepEqual(harmony.inputSchema.properties.color_scheme.enum, PREFERENCE_VALUES.color_scheme);
});

test('harmony sends the color as `colors` and the scheme as a preference', () => {
  const r = buildRequest('harmony_generate_palette', { color: '6366f1', color_scheme: 'triadic' });
  assert.equal(r.endpoint, '/v2/tools/harmony');
  assert.equal(r.requiresKey, true);
  assert.deepEqual(r.body, { colors: ['#6366F1'], preferences: { color_scheme: 'triadic' } });
});

test('a tool called without a color still sends one, or the API ignores its preferences', () => {
  const r = buildRequest('riff_generate_motion', { animation_style: 'energetic' });
  assert.equal(r.endpoint, '/v2/tools/riff');
  assert.deepEqual(r.body, { colors: [DEFAULT_SEED_COLOR], preferences: { animation_style: 'energetic' } });
  const d = buildRequest('duet_pair_fonts', {});
  assert.deepEqual(d.body, { colors: [DEFAULT_SEED_COLOR] });
});

test("each builder's own knob maps to the preference the API reads", () => {
  const cases = [
    ['duet_pair_fonts', { type_style: 'classical' }, '/v2/tools/duet', { type_style: 'classical' }],
    ['tempo_generate_scale', { density: 'airy' }, '/v2/tools/tempo', { density: 'airy' }],
    ['chord_generate_shadows', { color: '#E11D48', shadow_intensity: 'dramatic' }, '/v2/tools/chord', { shadow_intensity: 'dramatic' }],
    ['cadence_generate_grid', { density: 'compact' }, '/v2/tools/cadence', { density: 'compact' }],
  ];
  for (const [name, args, endpoint, prefs] of cases) {
    const r = buildRequest(name, args);
    assert.equal(r.endpoint, endpoint, name);
    assert.deepEqual(r.body.preferences, prefs, name);
  }
});

test('the shared `preferences` object passes through and a top-level knob wins over it', () => {
  const r = buildRequest('chord_generate_shadows', {
    color: '#6366F1',
    shadow_intensity: 'flat',
    preferences: { shadow_intensity: 'dramatic', color_scheme: 'triadic' },
  });
  assert.deepEqual(r.body, { colors: ['#6366F1'], preferences: { color_scheme: 'triadic', shadow_intensity: 'flat' } });
});

test('extra brand colors ride along, five at most', () => {
  const r = buildRequest('harmony_generate_palette', { color: '#6366F1', colors: ['#e11d48', '0f172a'] });
  assert.deepEqual(r.body.colors, ['#6366F1', '#E11D48', '#0F172A']);
  assert.throws(() => buildRequest('harmony_generate_palette', { color: '#111111', colors: ['#222222', '#333333', '#444444', '#555555', '#666666'] }), /at most 5/);
});

test('bad input is refused here, with the valid values named', () => {
  assert.throws(() => buildRequest('harmony_generate_palette', {}), /color is required/);
  assert.throws(() => buildRequest('harmony_generate_palette', { color: 'blue' }), /not a hex color/);
  assert.throws(() => buildRequest('harmony_generate_palette', { color: '#6366F1', color_scheme: 'tetradic' }), /monochromatic, analogous, complementary, triadic, split-complementary/);
  assert.throws(() => buildRequest('tempo_generate_scale', { preferences: { density: 'cozy' } }), /compact, balanced, airy/);
  assert.throws(() => buildRequest('tempo_generate_scale', { preferences: { ratio: 1.618 } }), /unknown preference "ratio"/);
  assert.throws(() => buildRequest('no_such_tool', {}), /Unknown tool/);
});

test('compose sends `formats` (plural), defaults to css and json, and refuses formats the API lacks', () => {
  assert.deepEqual(buildRequest('compose_export', { color: '#6366F1' }).body, { colors: ['#6366F1'], formats: ['css', 'json'] });
  const r = buildRequest('compose_export', { color: '#6366F1', formats: ['tailwind', 'scss'], density: 'airy' });
  assert.equal(r.endpoint, '/v2/tools/compose');
  assert.deepEqual(r.body, { colors: ['#6366F1'], preferences: { density: 'airy' }, formats: ['tailwind', 'scss'] });
  assert.throws(() => buildRequest('compose_export', { color: '#6366F1', formats: ['figma-tokens'] }), /css, json, tailwind, scss/);
});

test('pitch audits the palette built from a color; it is not a gradient tool', () => {
  const r = buildRequest('pitch_audit_contrast', { color: '#6366F1', contrast_algorithm: 'apca', audit_all_combinations: true });
  assert.equal(r.endpoint, '/v2/tools/pitch');
  assert.deepEqual(r.body, { colors: ['#6366F1'], accessibility: { contrast_algorithm: 'apca' }, audit_all_combinations: true });
  assert.throws(() => buildRequest('pitch_audit_contrast', { color: '#6366F1', contrast_algorithm: 'lab' }), /wcag2, apca/);
  const pitch = TOOLS.find((t) => t.name === 'pitch_audit_contrast');
  assert.doesNotMatch(pitch.description, /gradient/i);
});

test('the accessibility check is the keyless one and keeps its own endpoint', () => {
  const r = buildRequest('a11y_validate', { foreground: 'ffffff', background: '#6366f1', fontSize: 18 });
  assert.equal(r.endpoint, '/v2/a11y/validate');
  assert.equal(r.requiresKey, false);
  assert.deepEqual(r.body, { foreground: '#FFFFFF', background: '#6366F1', fontSize: 18 });
  assert.throws(() => buildRequest('a11y_validate', { foreground: '#fff' }), /background/);
});

test('bridge is the dark-mode builder and needs a color', () => {
  const r = buildRequest('bridge_generate_theme', { color: '#6366F1', color_scheme: 'complementary' });
  assert.equal(r.endpoint, '/v2/tools/bridge');
  assert.deepEqual(r.body, { colors: ['#6366F1'], preferences: { color_scheme: 'complementary' } });
  assert.throws(() => buildRequest('bridge_generate_theme', {}), /color is required/);
});
