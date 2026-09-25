const pagesHost = 'math-3d.pages.dev';
const targetOrigin = 'https://3d.cyb-math.cn';

export default {
  fetch(request, env) {
    const source = new URL(request.url);
    if (source.hostname === pagesHost || source.hostname.endsWith(`.${pagesHost}`)) {
      return Response.redirect(`${targetOrigin}${source.pathname}${source.search}`, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
