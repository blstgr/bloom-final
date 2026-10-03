import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { Provider as StoreProvider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';

import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { NavBar, type NavItem } from '../src/components/ui/NavBar';
import { Tabs, type TabItem } from '../src/components/ui/Tabs';
import { Touchable } from '../src/components/ui/Touchable';
import { PlantDataProvider } from '../src/features/plants/data/PlantDataProvider';
import { SettingsRow } from '../src/features/settings/components/SettingsPanel';
import { WateringSlider } from '../src/features/watering/components/WateringSlider';
import { WeatherProvider } from '../src/features/weather/WeatherProvider';
import { MainTabBar, SCREENS } from '../src/navigation';
import { store } from '../src/store/store';

function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });

  return renderer!;
}

describe('component behavior', () => {
  it('exposes disabled and busy accessibility state while a button is loading', () => {
    const renderer = render(<Button label="Save" loading />);
    const button = renderer.root.findByType(TouchableOpacity);

    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });

  it('maps input type, disabled state, error text, and password hiding to TextInput props', () => {
    const renderer = render(
      <Input
        disabled
        error="Required"
        label="Password"
        onChangeText={jest.fn()}
        type="password"
        value="secret"
      />,
    );
    const input = renderer.root.findByType(TextInput);

    expect(input.props.editable).toBe(false);
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.keyboardType).toBe('default');
    expect(JSON.stringify(renderer.toJSON())).toContain('Required');
  });

  it('uses email and number keyboard types for matching input types', () => {
    const emailRenderer = render(
      <Input label="Email" onChangeText={jest.fn()} type="email" value="" />,
    );
    const numberRenderer = render(
      <Input label="Age" onChangeText={jest.fn()} type="number" value="" />,
    );

    expect(emailRenderer.root.findByType(TextInput).props.keyboardType).toBe('email-address');
    expect(numberRenderer.root.findByType(TextInput).props.keyboardType).toBe('numeric');
  });

  it('supports unlabeled inputs with icon actions', () => {
    const onCameraPress = jest.fn();
    const renderer = render(
      <Input
        accessibilityLabel="Search plants"
        actions={[
          {
            accessibilityLabel: 'Open camera',
            icon: 'camera',
            key: 'open-camera',
            onPress: onCameraPress,
          },
        ]}
        leadingIcon="search"
        onChangeText={jest.fn()}
        value="ZZ plant"
      />,
    );

    expect(renderer.root.findByType(TextInput).props.accessibilityLabel).toBe('Search plants');

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'Open camera' }).props.onPress();
    });

    expect(onCameraPress).toHaveBeenCalledTimes(1);
  });

  it('falls back from an empty label to placeholder accessibility text', () => {
    const renderer = render(
      <Input
        label=""
        onChangeText={jest.fn()}
        placeholder="Search plants"
        value=""
      />,
    );

    expect(renderer.root.findByType(TextInput).props.accessibilityLabel).toBe('Search plants');
  });

  it('masks secure settings values and saves edited single-field values', () => {
    const onSave = jest.fn();
    const renderer = render(
      <SettingsRow
        buttonLabel="Edit"
        editable
        label="API key"
        onSave={onSave}
        secure
        value="sk-test-123456"
        variant="textWithLabelAndButton"
      />,
    );

    expect(JSON.stringify(renderer.toJSON())).toContain('••••••••••3456');

    ReactTestRenderer.act(() => {
      renderer.root.findByType(TouchableOpacity).props.onPress();
    });
    ReactTestRenderer.act(() => {
      renderer.root.findByType(TextInput).props.onChangeText('sk-live-654321');
    });
    ReactTestRenderer.act(() => {
      renderer.root.findByType(TouchableOpacity).props.onPress();
    });

    expect(onSave).toHaveBeenCalledWith('sk-live-654321');
  });

  it('saves multi-field settings values in field order', () => {
    const onSaveFields = jest.fn();
    const renderer = render(
      <SettingsRow
        buttonLabel="Edit"
        editable
        editFields={[
          { label: 'First name', value: 'Fern' },
          { label: 'Last name', value: 'Leaf' },
        ]}
        onSaveFields={onSaveFields}
        variant="textWithLabelAndButton"
      />,
    );

    ReactTestRenderer.act(() => {
      renderer.root.findByType(TouchableOpacity).props.onPress();
    });

    const inputs = renderer.root.findAllByType(TextInput);
    ReactTestRenderer.act(() => {
      inputs[0].props.onChangeText('Moss');
      inputs[1].props.onChangeText('Stone');
    });
    ReactTestRenderer.act(() => {
      renderer.root.findByType(TouchableOpacity).props.onPress();
    });

    expect(onSaveFields).toHaveBeenCalledWith(['Moss', 'Stone']);
  });

  it('renders nav labels, badges, tab active state, and press handlers from item data', () => {
    const onPlantsPress = jest.fn();
    const items: NavItem[] = [
      { accessibilityLabel: 'Home tab', icon: 'home', key: 'home' },
      {
        accessibilityLabel: 'Plants tab',
        badgeCount: 3,
        icon: 'plant',
        key: 'plants',
        onPress: onPlantsPress,
      },
      { accessibilityLabel: 'Camera action', icon: 'camera', key: 'camera' },
    ];
    const renderer = render(<NavBar activeKey="home" items={items} />);
    const buttons = renderer.root.findAllByType(TouchableOpacity);

    expect(buttons[0].props.accessibilityLabel).toBe('Home tab');
    expect(buttons[0].props.accessibilityState.selected).toBe(true);
    expect(buttons[1].props.accessibilityLabel).toBe('Plants tab');
    expect(buttons[1].props.accessibilityState.selected).toBe(false);
    expect(buttons[2].props.accessibilityState.selected).toBe(false);
    expect(JSON.stringify(renderer.toJSON())).toContain('3');

    ReactTestRenderer.act(() => {
      buttons[1].props.onPress();
    });

    expect(onPlantsPress).toHaveBeenCalledTimes(1);
  });

  it('marks a single active tab and reports presses by key', () => {
    const onTabPress = jest.fn();
    const tabs: TabItem[] = [
      { key: 'all', label: 'All' },
      { key: 'diva', label: 'High-Maintenance' },
    ];
    const renderer = render(<Tabs activeKey="all" onTabPress={onTabPress} tabs={tabs} />);
    const tabButtons = renderer.root.findAllByType(Touchable);

    expect(tabButtons[0].props.accessibilityState.selected).toBe(true);
    expect(tabButtons[1].props.accessibilityState.selected).toBe(false);

    ReactTestRenderer.act(() => {
      tabButtons[1].props.onPress();
    });

    expect(onTabPress).toHaveBeenCalledWith('diva');
  });

  it('keeps the main add-plant action visually inactive on every tab', () => {
    const tabScreens = [SCREENS.HOME, SCREENS.LIBRARY, SCREENS.WATER] as const;

    for (const activeScreen of tabScreens) {
      const renderer = render(
        <StoreProvider store={store}>
          <PlantDataProvider initialOwnedPlants={[]}>
            <WeatherProvider>
              <MainTabBar
              activeScreen={activeScreen}
              onAddPlant={jest.fn()}
              onNavigate={jest.fn()}
            />
            </WeatherProvider>
          </PlantDataProvider>
        </StoreProvider>,
      );
      const addButton = renderer.root
        .findAllByProps({ accessibilityLabel: 'Add plant' })
        .find(node => node.props.accessibilityRole === 'button');

      expect(addButton?.props.accessibilityState.selected).toBe(false);

      // Paired with a positive case so this can't pass vacuously. Asserting the add button
      // renders a `colors.icon.primary` Icon would: every item now renders both a primary and an
      // inverse layer and cross-fades their opacity, so that colour is always present.
      const activeItem = renderer.root
        .findAllByProps({ accessibilityRole: 'button' })
        .find(node => node.props.accessibilityState?.selected === true);

      expect(activeItem).toBeTruthy();
    }
  });

  it('supports WateringSlider controlled states and accessibility activation', () => {
    const onComplete = jest.fn();
    const renderer = render(<WateringSlider onComplete={onComplete} />);
    const control = renderer.root.findByProps({ accessibilityRole: 'button' });

    expect(control.props.accessibilityLabel).toBe('Complete watering');
    expect(control.props.accessibilityState.checked).toBe(false);

    ReactTestRenderer.act(() => {
      control.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    });

    const updatedControl = renderer.root.findByProps({ accessibilityRole: 'button' });
    expect(updatedControl.props.accessibilityState.checked).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('guards WateringSlider accessibility completion against rapid duplicate activation', () => {
    const onComplete = jest.fn();
    const renderer = render(<WateringSlider onComplete={onComplete} />);
    const control = renderer.root.findByProps({ accessibilityRole: 'button' });

    ReactTestRenderer.act(() => {
      control.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
      control.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not complete a controlled WateringSlider from accessibility activation', () => {
    const renderer = render(<WateringSlider state="default" />);
    const control = renderer.root.findByProps({ accessibilityRole: 'button' });

    ReactTestRenderer.act(() => {
      control.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    });

    expect(control.props.accessibilityState.checked).toBe(false);
  });
});
