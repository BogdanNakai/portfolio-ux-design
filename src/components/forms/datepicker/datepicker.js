// Підключення модуля
import datepicker from 'js-datepicker';

import './datepicker.scss'

if (document.querySelector('[data-fls-datepicker]')) {
	const picker = datepicker('[data-fls-datepicker]', {
		customDays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
		customMonths: ["Січ", "Лют", "Берез", "Квіт", "Трав", "Черв", "Лип", "Серп", "Верес", "Жовт", "Листоп", "Груд"],
		overlayButton: 'Застосувати',
		overlayPlaceholder: 'Рік (4 цифри)',
		startDay: 1,
		formatter: (input, date, instance) => {
			const value = date.toLocaleDateString()
			input.value = value
		},
		onSelect: function (input, instance, date) {

		}
	});
	flsModules.datepicker = picker;
}
