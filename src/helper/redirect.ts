/**
 * Generic HTTP redirect wrapped modeled after Spring's `RedirectView`.
 *
 * You can either return `new RedirectView(url)` or `RedirectView.redirect(url)` inside of a controller method.
 */
export class RedirectView {
  _url: string;

  constructor(url: string) {
    this._url = url;
  }

  getUrl(): string {
    return this._url;
  }

  /**
   * Instantiate `RedirectView` with the given `url`.
   */
  static redirect(url: string): RedirectView {
    return new RedirectView(url);
  }
}
