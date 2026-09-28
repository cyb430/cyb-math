import { webview } from '@kit.ArkWeb';
import { common } from '@kit.AbilityKit';
import { promptAction, KeyboardAvoidMode as UIKitKeyboardAvoidMode } from '@kit.ArkUI';
import { TOOLS, MathTool, toolLabel, translate } from '../model/Tools';
import { NativeBridge, MathKey, EditorState, PageState, UpdateInfo } from '../model/NativeBridge';

@Entry
@Component
struct Index {
  @State private current: string = '';
  @State private language: string = 'zh-Hans';
  @State private dark: boolean = false;
  @State private screenWidth: number = 390;
  @State private toolsVisible: boolean = true;
  @State private query: string = '';
  @State private keys: MathKey[] = [];
  @State private favorites: string[] = [];
  @State private automatic: boolean = true;
  @StorageLink('cybActive') @Watch('activeChanged') private active: boolean = true;
  private controller: webview.WebviewController = new webview.WebviewController();
  private bridge: NativeBridge = new NativeBridge(this.controller);
  private pendingFile: string = '';
  private initialized: boolean = false;
  private pageReady: boolean = false;

  aboutToAppear(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.getUIContext().setKeyboardAvoidMode(UIKitKeyboardAvoidMode.RESIZE);
    this.bridge.initialize(getContext(this) as common.UIAbilityContext);
    this.language = this.bridge.get('language', 'zh-Hans');
    this.automatic = this.bridge.get('automaticUpdates', 'true') !== 'false';
    this.favorites = this.bridge.get('favorites', '').split(',').filter(value => value.length > 0);
    this.bridge.editorChanged = (state: EditorState): void => { this.keys = state.active ? state.keys : []; };
    this.bridge.pageChanged = (state: PageState): void => {
      this.language = state.language; this.dark = state.dark; this.current = state.site;
      this.toolsVisible = false; this.pageReady = true;
    };
    this.bridge.navigate = (file: string): void => { this.openFile(file); };
    this.bridge.notify = (message: string): void => { promptAction.showToast({ message: message, duration: 3000 }); };
    this.bridge.updateFound = (info: UpdateInfo): void => {
      AlertDialog.show({ title: this.t('发现新版本', '發現新版本', 'Update available'), message: '1.0.0 → ' + info.version,
        buttons: [{ value: this.t('前往下载', '前往下載', 'Download'), action: () => this.bridge.openRelease(info.tag) },
          { value: this.t('稍后', '稍後', 'Later'), action: () => {} },
          { value: this.t('忽略此版本', '忽略此版本', 'Ignore version'), action: () => this.bridge.put('ignoredVersion', info.version) }] });
    };
    this.bridge.checkUpdates(false);
  }
  private t(hans: string, hant: string, english: string): string { return translate(this.language, hans, hant, english); }
  private foreground(): string { return this.dark ? '#EBEDF0' : '#1C1E22'; }
  private shellBackground(): string { return this.dark ? '#1F2125' : '#F7F8FA'; }
  private filtered(): MathTool[] {
    const query = this.query.trim().toLowerCase();
    return TOOLS.filter(tool => (tool.hans + tool.hant + tool.english + tool.terms).toLowerCase().includes(query)).sort((a, b) => Number(this.favorites.includes(b.site)) - Number(this.favorites.includes(a.site)));
  }
  private label(): string { const tool = TOOLS.find(item => item.site === this.current); return tool ? toolLabel(tool, this.language) : 'CYB Math'; }
  private openFile(file: string): void {
    const tool = TOOLS.find(item => item.file === file); if (!tool) return;
    this.keys = [];
    if (!this.current) { this.current = tool.site; this.pendingFile = file; this.toolsVisible = false; }
    else this.bridge.run('window.CYBHarmony.navigate(' + JSON.stringify(file) + ',' + JSON.stringify(this.language) + ')');
  }
  private openProject(): void {
    AlertDialog.show({ message: this.t('打开项目将替换当前输入，是否继续？', '開啟專案將取代目前輸入，是否繼續？', 'Opening a project replaces the current inputs. Continue?'),
      primaryButton: { value: this.t('取消', '取消', 'Cancel'), action: () => {} },
      secondaryButton: { value: this.t('打开', '開啟', 'Open'), action: () => this.bridge.run('window.CYBHarmony.openProject()') } });
  }
  private activeChanged(): void {
    if (!this.pageReady) return;
    if (this.active) this.controller.onActive();
    else { this.bridge.run('window.CYBHarmony.persist()'); this.controller.onInactive(); }
  }
  onBackPress(): boolean {
    if (this.keys.length > 0) { this.keys = []; this.bridge.run('document.activeElement.blur()'); return true; }
    if (this.toolsVisible && this.current) { this.toolsVisible = false; return true; }
    if (this.current && this.controller.accessBackward()) { this.controller.backward(); return true; }
    if (this.current) { this.bridge.run('window.CYBHarmony.persist()'); this.toolsVisible = true; this.current = ''; return true; }
    return false;
  }
  @Builder private toolsList() {
    Column() {
      TextInput({ text: this.query, placeholder: this.t('搜索数学工具', '搜尋數學工具', 'Search math tools') })
        .onChange(value => this.query = value).margin({ left: 12, right: 12, top: 8, bottom: 8 })
      List() {
        ForEach(this.filtered(), (tool: MathTool) => {
          ListItem() {
            Row() {
              Text(toolLabel(tool, this.language)).fontSize(16).fontColor(this.foreground()).layoutWeight(1)
                .onClick(() => this.openFile(tool.file)).padding({ top: 16, bottom: 16 })
              Button(this.favorites.includes(tool.site) ? '★' : '☆', { type: ButtonType.Normal })
                .width(44).height(44).backgroundColor(Color.Transparent).fontColor(this.foreground())
                .accessibilityText(this.t('收藏', '收藏', 'Favorite')).onClick(() => {
                  this.favorites = this.favorites.includes(tool.site) ? this.favorites.filter(value => value !== tool.site) : this.favorites.concat([tool.site]);
                  this.bridge.put('favorites', this.favorites.join(','));
                })
            }.padding({ left: 16, right: 8 })
          }
        }, (tool: MathTool) => tool.site)
      }.layoutWeight(1).divider({ strokeWidth: 1, color: this.dark ? '#373A40' : '#E3E5E9' })
      Row({ space: 12 }) {
        Select([{ value: '简体中文' }, { value: '繁體中文' }, { value: 'English' }]).selected(this.language === 'en' ? 2 : this.language === 'zh-Hant' ? 1 : 0)
          .onSelect((index: number) => { this.language = ['zh-Hans', 'zh-Hant', 'en'][index]; this.bridge.put('language', this.language); if (this.current) this.openFile(TOOLS.find(tool => tool.site === this.current)?.file || 'index.html'); })
        Toggle({ type: ToggleType.Switch, isOn: this.automatic }).onChange(value => { this.automatic = value; this.bridge.put('automaticUpdates', value.toString()); })
          .accessibilityText(this.t('自动检查更新', '自動檢查更新', 'Automatic update checks'))
      }.padding(12)
    }.height('100%').backgroundColor(this.shellBackground())
  }
  build() {
    Column() {
      Row({ space: 4 }) {
        Button('←', { type: ButtonType.Normal }).width(44).height(44).fontSize(22).backgroundColor(Color.Transparent).fontColor(this.foreground())
          .accessibilityText(this.t('返回', '返回', 'Back')).onClick(() => this.onBackPress())
        Text(this.label()).fontSize(16).fontWeight(FontWeight.Medium).fontColor(this.foreground()).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).layoutWeight(1)
          .onClick(() => this.toolsVisible = !this.toolsVisible)
        Button('⋮', { type: ButtonType.Normal }).width(44).height(44).fontSize(24).backgroundColor(Color.Transparent).fontColor(this.foreground())
          .accessibilityText(this.t('菜单', '選單', 'Menu')).bindMenu([
            { value: this.t('数学工具', '數學工具', 'Math tools'), action: () => this.toolsVisible = !this.toolsVisible },
            { value: this.t('保存学习项目', '儲存學習專案', 'Save project'), enabled: this.pageReady && this.current.length > 0, action: () => this.bridge.run('window.CYBHarmony.saveProject()') },
            { value: this.t('打开学习项目', '開啟學習專案', 'Open project'), enabled: this.pageReady && this.current.length > 0, action: () => this.openProject() },
            { value: this.t('分享', '分享', 'Share'), enabled: this.pageReady && this.current.length > 0, action: () => this.bridge.run('window.CYBHarmony.share()') },
            { value: this.t('切换主题', '切換主題', 'Switch theme'), enabled: this.pageReady && this.current.length > 0, action: () => this.bridge.run("window.CYBToolAction('theme')") },
            { value: this.t('帮助', '說明', 'Help'), enabled: this.pageReady && this.current.length > 0, action: () => this.bridge.run("window.CYBToolAction('help')") },
            { value: this.t('检查更新', '檢查更新', 'Check for updates'), action: () => this.bridge.checkUpdates(true) }
          ])
      }.height(48).padding({ left: 4, right: 4 }).backgroundColor(this.shellBackground())
      Row() {
        if (this.toolsVisible || this.screenWidth >= 720) { Column() { this.toolsList(); }.width(this.screenWidth >= 720 ? 240 : '100%').height('100%'); }
        if (this.current) {
          Web({ src: $rawfile('pages/index.html'), controller: this.controller })
            .javaScriptAccess(true).domStorageAccess(true).fileAccess(true).mixedMode(MixedMode.None)
            .javaScriptProxy({ object: this.bridge, name: 'CYBNative', methodList: ['editorState', 'pageState', 'persist', 'handoff', 'save', 'open', 'share'], controller: this.controller })
            .onPageEnd(() => { if (this.pendingFile) { const file = this.pendingFile; this.pendingFile = ''; this.bridge.run('window.CYBHarmony.navigate(' + JSON.stringify(file) + ',' + JSON.stringify(this.language) + ')'); } })
            .visibility(this.toolsVisible && this.screenWidth < 720 ? Visibility.None : Visibility.Visible).layoutWeight(1).height('100%')
            .onUrlLoadIntercept((event) => { if (!event) return false; const url: string = typeof event.data === 'string' ? event.data : event.data.getRequestUrl(); if (/^https?:/.test(url)) { (getContext(this) as common.UIAbilityContext).startAbility({ action: 'ohos.want.action.viewData', uri: url }); return true; } return false; })
        }
      }.layoutWeight(1).width('100%')
      if (this.keys.length > 0 && !this.toolsVisible) {
        Scroll() {
          Row() {
            ForEach(this.keys, (key: MathKey) => {
              Button(key.label, { type: ButtonType.Normal }).width(48).height(48).fontSize(17).backgroundColor(Color.Transparent).fontColor(this.foreground()).focusable(false)
                .onClick(() => this.bridge.run('window.CYBHarmony.insert(' + JSON.stringify(key.value) + ')'))
            }, (key: MathKey) => key.value)
            Button('⌄', { type: ButtonType.Normal }).width(48).height(48).backgroundColor(Color.Transparent).fontColor(this.foreground())
              .accessibilityText(this.t('收起', '收起', 'Hide')).onClick(() => { this.keys = []; this.bridge.run('document.activeElement.blur()'); })
          }
        }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).height(48).width('100%').backgroundColor(this.shellBackground())
      }
    }.height('100%').width('100%').backgroundColor(this.shellBackground()).onAreaChange((_oldArea: Area, area: Area) => { this.screenWidth = Number(area.width); })
  }
}
