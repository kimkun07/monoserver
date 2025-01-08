const evtSource = new EventSource("/events");
const signalCountElement = document.getElementById("signal-count");

evtSource.onmessage = (event) => {
  signalCountElement.textContent = event.data;
  signalCountElement.style.transform = "scale(1.2)";
  setTimeout(() => {
    signalCountElement.style.transform = "scale(1)";
  }, 200);
};

evtSource.onerror = () => {
  console.log("EventSource failed");
};
