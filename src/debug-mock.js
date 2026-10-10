const debugMock = () => {
  const log = () => {};
  log.enabled = false;
  log.color = 0;
  return log;
};
export default debugMock;
