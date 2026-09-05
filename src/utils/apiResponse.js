/**
 * Uniform JSON envelopes required by project standards.
 */

/**
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} [status=200]
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/**
 * @param {import('express').Response} res
 * @param {{ message: string, code: string }} error
 * @param {number} [status=400]
 */
export function sendError(res, error, status = 400) {
  const responseError = { message: error.message, code: error.code };
  if (Array.isArray(error.details) && error.details.length > 0) {
    responseError.details = error.details;
  }
  return res.status(status).json({
    success: false,
    error: responseError
  });
}
