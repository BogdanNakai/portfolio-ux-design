import { initSliders } from "../../layout/slider/slider";

const options = document.getElementById('options');
const cartWorks = document.querySelectorAll('#cartWorks');

options?.addEventListener('change', (event) => {
	let valueFilter = event.target.value;

	cartWorks?.forEach(e => {
		e.classList.remove('hide');
		if (e.getAttribute('data-category') !== valueFilter && valueFilter !== 'all' ) {
			e.classList.add('hide');
			initSliders()
		} else {
			e.classList.remove('hide');
		}
	});
})


