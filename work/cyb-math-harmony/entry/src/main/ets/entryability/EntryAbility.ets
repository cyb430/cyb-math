import { UIAbility, Configuration } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';

export default class EntryAbility extends UIAbility {
  onWindowStageCreate(stage: window.WindowStage): void {
    AppStorage.setOrCreate('cybActive', true);
    stage.loadContent('pages/Index');
    stage.getMainWindow().then((main: window.Window) => {
      main.setWindowLayoutFullScreen(false);
    });
  }
  onForeground(): void { AppStorage.setOrCreate('cybActive', true); }
  onBackground(): void { AppStorage.setOrCreate('cybActive', false); }
  onConfigurationUpdate(configuration: Configuration): void { AppStorage.setOrCreate('cybFontScale', configuration.fontSizeScale || 1); }
}
