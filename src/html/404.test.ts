import { Html404ErrorPage } from "./404";

describe("basic 404 tests", () => {
  const err = "test error msg";

  it("error renders in 404 page", () => {
    const errorPage = Html404ErrorPage(err);

    expect(errorPage.includes(err)).toBeTruthy();
  });
});
