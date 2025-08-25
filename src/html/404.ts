/**
 * Default Express.js 404 error page, as a string.
 */
export const Html404ErrorPage = (error: string): string =>
  `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>${error}</pre>
</body>
</html>
`;
