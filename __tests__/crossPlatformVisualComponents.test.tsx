import React from 'react';
import { Platform, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { Badge } from '../src/components/ui/Badge';
import { BadgePill } from '../src/components/ui/BadgePill';
import { Button } from '../src/components/ui/Button';
import { PhotoGrid } from '../src/components/ui/PhotoGrid';
import { PlantCard } from '../src/components/ui/PlantCard';

const plantImage = require('../src/assets/start/start-grid-01.jpg');

function renderForPlatform(platform: 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => platform,
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <View>
        <Button icon="water" label="Start watering" />
        <Button accessibilityLabel="Add plant" icon="plus" iconOnly size="small" variant="secondary" />
        <Badge count={3} />
        <BadgePill day="15" month="May" variant="default" />
        <PhotoGrid randomSeed={17}>
          <PlantCard accessibilityLabel="Open plant with watering badge" image={plantImage} badge={{ type: 'badge', icon: 'water' }} />
          <PlantCard accessibilityLabel="Open plant due on 15 May" image={plantImage} badge={{ type: 'pill', label: '15 May' }} />
          <PlantCard accessibilityLabel="Open plant" image={plantImage} />
        </PhotoGrid>
      </View>,
    );
  });

  return renderer!.toJSON();
}

/**
 * What a person can perceive and operate, in order: every accessible control's role and name, and
 * every piece of text.
 *
 * The rendered trees themselves differ by design since docs/search-spec.md §4–5 — Android draws
 * an opaque Material surface and a ripple where iOS draws glass and a fade — so the tree shape is no
 * longer the thing to hold equal. What must stay equal is that both platforms offer the same
 * controls with the same names.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectPerceivable(node: any, out: string[] = []): string[] {
  if (!node) return out;
  if (typeof node === 'string') {
    out.push(`text:${node}`);
    return out;
  }
  if (node.props?.accessible && (node.props.accessibilityRole || node.props.accessibilityLabel)) {
    out.push(`${node.props.accessibilityRole ?? 'none'}:${node.props.accessibilityLabel ?? ''}`);
  }
  (node.children ?? []).forEach((child: unknown) => collectPerceivable(child, out));

  return out;
}

describe('shared visual components', () => {
  it.each(['ios', 'android'] as const)('renders on %s without platform-specific crashes', platform => {
    expect(renderForPlatform(platform)).toBeTruthy();
  });

  it('offers the same controls and text on iOS and Android', () => {
    const android = collectPerceivable(renderForPlatform('android'));

    expect(android.length).toBeGreaterThan(0);
    expect(android).toEqual(collectPerceivable(renderForPlatform('ios')));
  });
});
