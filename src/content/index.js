import("./messaging/listener.js")
  .then((module) => {
    module.registerMessageListener();
  })
  .catch((error) => {
    throw error;
  });
