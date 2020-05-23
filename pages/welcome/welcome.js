const eui = document.querySelector('#eui');
const devAddr = document.querySelector('#devAddr');
const gatewayId = document.querySelector('#gatewayId');
const token = document.querySelector('#token');

const form = document.querySelector('form');
const button = document.querySelector('button');

const formatter = (value) => value.replace(/\s|\s+/g, '').toLowerCase()
const handleSubmit = (e) => {
  e.preventDefault();

  const unlock = eui.value && devAddr.value && gatewayId.value && token.value;
  if (unlock) {
    localStorage.setItem('eui', formatter(eui.value));
    localStorage.setItem('devAddr', formatter(devAddr.value));
    localStorage.setItem('gatewayId', formatter(gatewayId.value));
    localStorage.setItem('token', token.value);

    window.location.href = '/LoRaWAN-jamming-detector/pages/detection/detection.html';
  };
};

form.addEventListener('submit', handleSubmit);