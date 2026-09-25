const pagesHost = 'math-sequence.pages.dev';
const targetOrigin = 'https://sequence.cyb-math.cn';

export default {
  fetch(request, env) {
    const source = new URL(request.url);
    if (source.hostname === pagesHost || source.hostname.endsWith(`.${pagesHost}`)) {
      return Response.redirect(`${targetOrigin}${source.pathname}${source.search}`, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
