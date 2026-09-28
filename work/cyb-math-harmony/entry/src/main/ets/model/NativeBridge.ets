import { common } from '@kit.AbilityKit';
import { fileIo, picker } from '@kit.CoreFileKit';
import { preferences } from '@kit.ArkData';
import { util } from '@kit.ArkTS';
import { systemShare } from '@kit.ShareKit';
import { http } from '@kit.NetworkKit';
import { webview } from '@kit.ArkWeb';
import { TOOLS } from './Tools';

export interface MathKey { label: string; value: string; }
export interface EditorState { active: boolean; keys: MathKey[]; language: string; }
export interface PageState { site: string; language: string; dark: boolean; }
interface FilePayload { name: string; mime: string; base64: string; text: string; }
interface NativeRequest { id: number; payload: FilePayload; }
interface Project { format: string; version: number; site: string; fields: Object[]; storage: Object[]; hash: string; }
interface Asset { name: string; }
interface Release { tag_name: string; draft: boolean; prerelease: boolean; assets: Asset[]; }
export interface UpdateInfo { version: string; tag: string; }
export interface NativeResult { canceled?: boolean; raw?: string; error?: string; saved?: boolean; }

export class NativeBridge {
  private controller: webview.WebviewController;
  private context?: common.UIAbilityContext;
  private settings?: preferences.Preferences;
  private pending: string = '';
  private checking: boolean = false;
  editorChanged: (state: EditorState) => void = (_state: EditorState): void => {};
  pageChanged: (state: PageState) => void = (_state: PageState): void => {};
  navigate: (file: string) => void = (_file: string): void => {};
  notify: (message: string) => void = (_message: string): void => {};
  updateFound: (info: UpdateInfo) => void = (_info: UpdateInfo): void => {};
  constructor(controller: webview.WebviewController) { this.controller = controller; }
  initialize(context: common.UIAbilityContext): void {
    this.context = context;
    this.settings = preferences.getPreferencesSync(context, { name: 'cyb-app' });
    try { this.pending = fileIo.readTextSync(context.filesDir + '/last-project.json'); } catch (_) {}
  }
  get(key: string, fallback: string): string { return this.settings?.getSync(key, fallback) as string || fallback; }
  put(key: string, value: string): void { this.settings?.putSync(key, value); this.settings?.flush(); }
  editorState(raw: string): void {
    if (raw.length > 16000) return;
    try { const state = JSON.parse(raw) as EditorState; if (state.keys.length <= 40) this.editorChanged(state); } catch (_) {}
  }
  pageState(raw: string): void {
    try {
      const state = JSON.parse(raw) as PageState;
      if (!TOOLS.some(tool => tool.site === state.site)) return;
      this.put('lastSite', state.site); this.put('language', state.language); this.pageChanged(state);
      if (this.pending) {
        const data = this.project(this.pending);
        if (data.site === state.site) {
          const pending = this.pending; this.pending = '';
          this.run('window.CYBHarmony.stage(' + JSON.stringify(pending) + ')');
        }
      }
    } catch (_) {}
  }
  private project(raw: string): Project {
    if (raw.length > 12 * 1024 * 1024) throw new Error('Project exceeds 12 MB');
    const project = JSON.parse(raw) as Project;
    if (project.format !== 'CYB-Math-Project' || project.version !== 1 || !TOOLS.some(tool => tool.site === project.site) || !Array.isArray(project.fields) || !Array.isArray(project.storage)) throw new Error('Invalid CYB Math project');
    return project;
  }
  persist(raw: string): void {
    if (!this.context) return;
    try {
      this.project(raw);
      const file = fileIo.openSync(this.context.filesDir + '/last-project.tmp', fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.TRUNC);
      try { fileIo.writeSync(file.fd, raw); } finally { fileIo.closeSync(file); }
      fileIo.renameSync(this.context.filesDir + '/last-project.tmp', this.context.filesDir + '/last-project.json');
    } catch (_) {}
  }
  handoff(raw: string): void {
    try {
      const data = this.project(raw);
      const tool = TOOLS.find(item => item.site === data.site);
      if (!tool) return;
      this.pending = raw; this.navigate(tool.file);
    } catch (_) { this.notify('Invalid CYB Math project'); }
  }
  run(script: string): void { this.controller.runJavaScript(script).catch(() => {}); }
  private respond(id: number, result: NativeResult): void { this.run('window.CYBHarmony.result(' + id.toString() + ',' + JSON.stringify(result) + ')'); }
  save(raw: string): void { this.saveAsync(raw); }
  private async saveAsync(raw: string): Promise<void> {
    let id: number = 0;
    try {
      const request = JSON.parse(raw) as NativeRequest; id = request.id;
      if (!this.context || request.payload.base64.length > 70000000) throw new Error('Export exceeds 50 MB');
      const bytes = new util.Base64Helper().decodeSync(request.payload.base64);
      if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Export exceeds 50 MB');
      const name = request.payload.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 160) || 'CYB-Math-export';
      const selection = await new picker.DocumentViewPicker(this.context).save({ newFileNames: [name] });
      if (selection.length === 0) { this.respond(id, { canceled: true }); return; }
      const file = fileIo.openSync(selection[0], fileIo.OpenMode.READ_WRITE);
      try { fileIo.writeSync(file.fd, bytes.buffer as ArrayBuffer); } finally { fileIo.closeSync(file); }
      this.respond(id, { saved: true });
    } catch (error) { this.respond(id, { error: 'Unable to save file' }); }
  }
  open(raw: string): void { this.openAsync(raw); }
  private async openAsync(raw: string): Promise<void> {
    let id: number = 0;
    try {
      id = (JSON.parse(raw) as NativeRequest).id;
      if (!this.context) throw new Error('Application context unavailable');
      const selection = await new picker.DocumentViewPicker(this.context).select({ maxSelectNumber: 1, fileSuffixFilters: ['.json'] });
      if (selection.length === 0) { this.respond(id, { canceled: true }); return; }
      const file = fileIo.openSync(selection[0], fileIo.OpenMode.READ_ONLY);
      let text: string = '';
      try {
        const size = fileIo.statSync(file.fd).size;
        if (size > 12 * 1024 * 1024) throw new Error('Project exceeds 12 MB');
        const buffer = new ArrayBuffer(size); const read = fileIo.readSync(file.fd, buffer);
        text = util.TextDecoder.create('utf-8').decodeWithStream(new Uint8Array(buffer, 0, read));
      } finally { fileIo.closeSync(file); }
      this.project(text); this.respond(id, { raw: text });
    } catch (_) { this.respond(id, { error: 'Unable to open CYB Math project' }); }
  }
  share(raw: string): void {
    try {
      const request = JSON.parse(raw) as NativeRequest;
      if (request.payload.text.length > 2000000) throw new Error('Share too large');
      if (!this.context) throw new Error('Application context unavailable');
      const data = new systemShare.SharedData({ utd: 'general.plain-text', content: request.payload.text });
      new systemShare.ShareController(data).show(this.context, { selectionMode: systemShare.SelectionMode.SINGLE }).then(() => {
        this.respond(request.id, { saved: true });
      }).catch(() => this.respond(request.id, { error: 'Unable to copy share link' }));
    } catch (_) {}
  }
  checkUpdates(manual: boolean): void { this.checkAsync(manual); }
  private async checkAsync(manual: boolean): Promise<void> {
    if (this.checking || !manual && (this.get('automaticUpdates', 'true') === 'false' || Date.now() - Number(this.get('lastCheck', '0')) < 86400000)) return;
    this.checking = true;
    const client = http.createHttp();
    const english = this.get('language', 'zh-Hans') === 'en';
    try {
      const response = await client.request('https://api.github.com/repos/cyb430/cyb-math/releases/latest', { method: http.RequestMethod.GET, connectTimeout: 8000, readTimeout: 8000, expectDataType: http.HttpDataType.STRING, header: { 'User-Agent': 'CYB-Math' } });
      if (response.responseCode !== 200 || (response.result as string).length > 1024 * 1024) throw new Error('Update server unavailable');
      const release = JSON.parse(response.result as string) as Release;
      if (release.draft || release.prerelease) throw new Error('Unpublished release');
      const asset = release.assets.find(item => /^CYB-Math-Harmony-\d+\.\d+\.\d+\.hap$/.test(item.name));
      this.put('lastCheck', Date.now().toString());
      if (!asset) { if (manual) this.notify(english ? 'No newer HarmonyOS release' : '暂无新版鸿蒙安装包'); return; }
      const version = asset.name.replace('CYB-Math-Harmony-', '').replace('.hap', '');
      const numbers = version.split('.').map(Number);
      const newer = numbers[0] > 1 || numbers[0] === 1 && (numbers[1] > 0 || numbers[2] > 0);
      if (!newer) { if (manual) this.notify(english ? 'You are up to date' : '已是最新版本'); return; }
      if (manual || this.get('ignoredVersion', '') !== version) this.updateFound({ version: version, tag: release.tag_name });
    } catch (_) { if (manual) this.notify(english ? 'Unable to check. Offline tools remain available.' : '无法检查更新，离线工具仍可使用。'); }
    finally { client.destroy(); this.checking = false; }
  }
  openRelease(tag: string): void {
    this.context?.startAbility({ action: 'ohos.want.action.viewData', uri: 'https://github.com/cyb430/cyb-math/releases/tag/' + encodeURIComponent(tag) });
  }
}
