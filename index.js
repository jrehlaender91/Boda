const desayunoButton = document.querySelector('#desayuno');
const comidaButton = document.querySelector('#comida');
const barButton = document.querySelector('#bar');
const cafeButton = document.querySelector('#cafe');
const hikesButton = document.querySelector('#hikes');

const desayunos = document.querySelector('.desayuno');
const comidas = document.querySelector('.comida');
const bar = document.querySelector('.bar');
const cafes = document.querySelector('.cafe');
const hikes = document.querySelector('.hike');

desayunoButton.addEventListener('click', () => {
    desayunoButton.classList.add('active');
    desayunos.classList.remove('d-none');

    comidas.classList.add('d-none');
    cafes.classList.add('d-none');
    bar.classList.add('d-none');
    hikes.classList.add('d-none');

    comidaButton.classList.remove('active');
    cafeButtonButton.classList.remove('active');
    barButtonButton.classList.remove('active');
    hikesButtonButton.classList.remove('active');
})

comidaButton.addEventListener('click', () => {
    comidaButton.classList.add('active');
    comidas.classList.remove('d-none');

    desayunos.classList.add('d-none');
    bar.classList.add('d-none');
    hikes.classList.add('d-none');
    cafes.classList.add('d-none');

    desayunoButton.classList.remove('active');
    barButton.classList.remove('active');
    hikesButtonButton.classList.remove('active');
    cafeButtonButton.classList.remove('active');
})

barButton.addEventListener('click', () => {
    barButton.classList.add('active');
    bar.classList.remove('d-none');

    comidas.classList.add('d-none');
    desayunos.classList.add('d-none');
    cafes.classList.add('d-none');
    hikes.classList.add('d-none');

    comidaButton.classList.remove('active');
    desayunoButton.classList.remove('active');
    cafeButton.classList.remove('active');
    hikesButton.classList.remove('active');
})

cafeButton.addEventListener('click', () => {
    cafeButton.classList.add('active');
    cafes.classList.remove('d-none');

    comidas.classList.add('d-none');
    desayunos.classList.add('d-none');
    hikes.classList.add('d-none');
    bar.classList.add('d-none');

    comidaButton.classList.remove('active');
    desayunoButton.classList.remove('active');
    barButton.classList.remove('active');
    hikesButton.classList.remove('active');
})


hikesButton.addEventListener('click', () => {
    hikesButton.classList.add('active');
    hikes.classList.remove('d-none');

    comidas.classList.add('d-none');
    desayunos.classList.add('d-none');
    cafes.classList.add('d-none');
    bar.classList.add('d-none');

    comidaButton.classList.remove('active');
    desayunoButton.classList.remove('active');
    barButton.classList.remove('active');
    cafeButton.classList.remove('active');
})

hikesButton.addEventListener('mouseenter' , () => {
    hikesButton.style.backgroundColor = "#5f7d3d";
})

hikesButton.addEventListener('mouseleave' , () => {
    hikesButton.style.backgroundColor = "#6a8b44";
})

desayunoButton.addEventListener('mouseenter' , () => {
    desayunoButton.style.backgroundColor = "#6e87b0";
})

desayunoButton.addEventListener('mouseleave' , () => {
    desayunoButton.style.backgroundColor = "#7b96c4";
})

comidaButton.addEventListener('mouseenter' , () => {
    comidaButton.style.backgroundColor = "#6e87b0";
})

comidaButton.addEventListener('mouseleave' , () => {
    comidaButton.style.backgroundColor = "#7b96c4";
})

barButton.addEventListener('mouseenter' , () => {
    barButton.style.backgroundColor = "#967caa";
})

barButton.addEventListener('mouseleave' , () => {
    barButton.style.backgroundColor = "#a78abd";
})

cafeButton.addEventListener('mouseenter' , () => {
    cafeButton.style.backgroundColor = "#967caa";
})

cafeButton.addEventListener('mouseleave' , () => {
    cafeButton.style.backgroundColor = "#a78abd";
})