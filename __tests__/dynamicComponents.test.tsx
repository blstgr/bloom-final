import React from 'react';
import { Platform, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { NavBar, type NavItem } from '../src/components/ui/NavBar';
import { Touchable } from '../src/components/ui/Touchable';
import { SettingsRow } from '../src/features/settings/components/SettingsPanel';
import { WateringSchedule } from '../src/features/watering/components/WateringSchedule';
import { WateringSlider } from '../src/features/watering/components/WateringSlider';

function setPlatform(platform: 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => platform,
  });
}

function renderOnPlatform(platform: 'android' | 'ios', element: React.ReactElement) {
  setPlatform(platform);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });

  return renderer!;
}

function serialize(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

describe('dynamic components', () => {
  it.each(['ios', 'android'] as const)('renders schedule data on %s', platform => {
    const renderer = renderOnPlatform(
      platform,
      <WateringSchedule
        items={[
          { completed: true, day: '1', id: 'completed', month: 'Jul' },
          { day: '15', id: 'upcoming', month: 'Jul' },
        ]}
      />,
    );

    const tree = serialize(renderer);

    expect(tree).toContain('Watering schedule');
    expect(tree).toContain('1\\nJul');
    expect(tree).toContain('15\\nJul');
  });

  it.each(['ios', 'android'] as const)('saves edited settings values on %s', platform => {
    const onSave = jest.fn();
    const renderer = renderOnPlatform(
      platform,
      <SettingsRow
        buttonLabel="Edit"
        editable
        label="Email"
        onSave={onSave}
        value="plantkiller@gmail.com"
        variant="textWithLabelAndButton"
      />,
    );

    const button = renderer.root.findByType(Touchable);

    ReactTestRenderer.act(() => {
      button.props.onPress();
    });

    const input = renderer.root.findByType(TextInput);

    ReactTestRenderer.act(() => {
      input.props.onChangeText('human-who-waters-plants@gmail.com');
    });

    const saveButton = renderer.root.findByType(Touchable);

    ReactTestRenderer.act(() => {
      saveButton.props.onPress();
    });

    expect(onSave).toHaveBeenCalledWith('human-who-waters-plants@gmail.com');
  });

  it.each(['ios', 'android'] as const)('updates tab active state from data on %s', platform => {
    const items: NavItem[] = [
      { icon: 'home', key: 'home' },
      { icon: 'plant', key: 'plants', badgeCount: 3 },
      { icon: 'camera', key: 'camera' },
    ];

    function InteractiveNavBar() {
      const [activeKey, setActiveKey] = React.useState('home');
      return (
        <NavBar
          activeKey={activeKey}
          items={items.map(item => ({
            ...item,
            onPress: item.key !== 'camera' ? () => setActiveKey(item.key) : item.onPress,
          }))}
        />
      );
    }

    const renderer = renderOnPlatform(platform, <InteractiveNavBar />);
    const navButtons = renderer.root.findAllByType(Touchable);

    expect(navButtons[0].props.accessibilityState.selected).toBe(true);
    expect(navButtons[1].props.accessibilityState.selected).toBe(false);

    ReactTestRenderer.act(() => {
      navButtons[1].props.onPress();
    });

    const updatedButtons = renderer.root.findAllByType(Touchable);

    expect(updatedButtons[0].props.accessibilityState.selected).toBe(false);
    expect(updatedButtons[1].props.accessibilityState.selected).toBe(true);
    expect(updatedButtons[2].props.accessibilityState.selected).toBe(false);
  });

  it.each(['ios', 'android'] as const)('renders controlled slider states on %s', platform => {
    const defaultSlider = renderOnPlatform(platform, <WateringSlider state="default" />);
    const completedSlider = renderOnPlatform(platform, <WateringSlider state="completed" />);

    const defaultControl = defaultSlider.root.findByProps({ accessibilityRole: 'button' });
    const completedControl = completedSlider.root.findByProps({ accessibilityRole: 'button' });

    expect(defaultControl.props.accessibilityState.checked).toBe(false);
    expect(completedControl.props.accessibilityState.checked).toBe(true);
  });
});
