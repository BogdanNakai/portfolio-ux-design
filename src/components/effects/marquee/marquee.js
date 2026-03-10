// Підключення функціоналу "Чортоги Фрілансера"
import { FLS } from "@js/common/functions.js";

import './marquee.scss'

// Модуль бігучого рядку
const marquee = () => {
	/*
		 Інструкція:
		 Структура: Можна вказувати будь які класи та теги елементам.
		 <div data-fls-marquee>
			 <span>element one</span>
			 <div>element two</div>
		 </div>
		 Додаткові налаштування (Можна не вказувати):
		 data-fls-marquee-space='30' - Відступ між елементами (За замовчанням 30px) - можна вказувати в css стмлями
		 data-fls-marquee-speed='1000' - Швидкість анімації (За замовчанням 1000) Вказувати в ms 1s = 1000
		 data-fls-marquee-pause-mouse-enter - Зупиняти анімацію при наведенні миші.
		 data-fls-marquee-direction='left' - Направлення анімації "top, right, bottom, left" (За замовчанням left)
		 !Важливо: При використанні data-fls-marquee-direction 'top' або 'bottom' має бути фіксована висота + overflow: hidden;
	 */

	const $marqueeArray = document.querySelectorAll('[data-fls-marquee]');
	const CLASS_NAMES = {
		wrapper: 'marquee-wrapper',
		inner: 'marquee-inner',
		item: 'marquee-item',
	};

	if (!$marqueeArray.length) return;

	const { head } = document;

	// Функція затримкованого виклику
	function debounce(delay, fn) {
		let timerId;
		return (...args) => {
			if (timerId) {
				clearTimeout(timerId);
			}
			timerId = setTimeout(() => {
				fn(...args);
				timerId = null;
			}, delay);
		};
	}

	// Подія зміни розмірів вьюпорта
	const onWindowWidthResize = (cb) => {
		if (!cb && !isFunction(cb)) return;

		let prevWidth = 0;

		const handleResize = () => {
			const currentWidth = window.innerWidth;

			if (prevWidth !== currentWidth) {
				prevWidth = currentWidth;
				cb();
			}
		};

		window.addEventListener('resize', debounce(50, handleResize));

		handleResize();
	};

	// Створюємо структуру
	const buildMarquee = (marqueeNode) => {
		if (!marqueeNode) return;

		const $marquee = marqueeNode;
		const $childElements = $marquee.children;

		if (!$childElements.length) return;
		$marquee.classList.add(CLASS_NAMES.wrapper);
		Array.from($childElements).forEach(($childItem) => $childItem.classList.add(CLASS_NAMES.item));

		const htmlStructure = `<div class="${CLASS_NAMES.inner}">${$marquee.innerHTML}</div>`;
		$marquee.innerHTML = htmlStructure;
	};

	// Функція отримання розмірів елементів
	const getElSize = ($el, isVertical) => {
		if (isVertical) return $el.offsetHeight;
		return $el.offsetWidth;
	};

	$marqueeArray.forEach(($wrapper) => {
		if (!$wrapper) return;

		buildMarquee($wrapper);

		const $marqueeInner = $wrapper.firstElementChild;
		let cacheArray = [];

		if (!$marqueeInner) return;

		const dataMarqueeSpace = parseFloat($wrapper.getAttribute('data-fls-marquee-space'));
		const $items = $wrapper.querySelectorAll(`.${CLASS_NAMES.item}`);
		const speed = parseFloat($wrapper.getAttribute('data-fls-marquee-speed')) / 10 || 100;
		const isMousePaused = $wrapper.hasAttribute('data-fls-marquee-pause');
		const direction = $wrapper.getAttribute('data-fls-marquee-direction');
		const isVertical = direction === 'bottom' || direction === 'top';
		const animName = `marqueeAnimation-${Math.floor(Math.random() * 10000000)}`;
		let spaceBetweenItem = parseFloat(window.getComputedStyle($items[0])?.getPropertyValue('margin-right'));
		let spaceBetween = spaceBetweenItem ? spaceBetweenItem : !isNaN(dataMarqueeSpace) ? dataMarqueeSpace : 30;
		let startPosition = parseFloat($wrapper.getAttribute('data-fls-marquee-start')) || 0;

		// Динамічні данні, вираховуються при роботі скрипту.
		let sumSize = 0;
		let firstScreenVisibleSize = 0;
		let initialSizeElements = 0;
		let initialElementsLength = $marqueeInner.children.length;
		let index = 0;
		let counterDuplicateElements = 0;

		// Ініціалізація івентів.
		const initEvents = () => {
			if (startPosition) $marqueeInner.addEventListener('animationiteration', onChangeStartPosition);

			if (!isMousePaused) return;
			$marqueeInner.removeEventListener('mouseenter', onChangePaused);
			$marqueeInner.removeEventListener('mouseleave', onChangePaused);
			$marqueeInner.addEventListener('mouseenter', onChangePaused);
			$marqueeInner.addEventListener('mouseleave', onChangePaused);
		};

		const onChangeStartPosition = () => {
			startPosition = 0;
			$marqueeInner.removeEventListener('animationiteration', onChangeStartPosition);
			onResize();
		};

		// Додавання базових стилів для корректної роботи анімації.
		const setBaseStyles = (firstScreenVisibleSize) => {
			let baseStyle = 'display: flex; flex-wrap: nowrap;';

			if (isVertical) {
				baseStyle += `
				flex-direction: column;
			 position: relative;
			 will-change: transform;`;

				if (direction === 'bottom') {
					baseStyle += `top: -${firstScreenVisibleSize}px;`;
				}
			} else {
				baseStyle += `
				position: relative;
			 will-change: transform;`;

				if (direction === 'right') {
					baseStyle += `left: -${firstScreenVisibleSize}px;;`;
				}
			}

			$marqueeInner.style.cssText = baseStyle;
		};

		// Функція повертає значення на яке потрібно змістити елементи при анімації.
		const setdirectionAnim = (totalWidth) => {
			switch (direction) {
				case 'right':
				case 'bottom':
					return totalWidth;
				default:
					return -totalWidth;
			}
		};

		// Функція анімації.
		const animation = () => {
			const keyFrameCss = `@keyframes ${animName} {
					 0% {
						 transform: translate${isVertical ? 'Y' : 'X'}(${startPosition}%);
					 }
					 100% {
						 transform: translate${isVertical ? 'Y' : 'X'}(${setdirectionAnim(firstScreenVisibleSize)}px);
					 }
				 }`;
			const $style = document.createElement('style');

			$style.classList.add(animName);
			$style.innerHTML = keyFrameCss;
			head.append($style);

			$marqueeInner.style.animation = `${animName} ${(firstScreenVisibleSize + (startPosition * firstScreenVisibleSize) / 100) / speed
				}s infinite linear`;
		};

		// Функція роботи з елементами. (дублювання, вказання \ підрахунок розмірів)
		const addDublicateElements = () => {
			// Після зміни розмірів екрану, обнуляємо всі динамічні данні.
			sumSize = firstScreenVisibleSize = initialSizeElements = counterDuplicateElements = index = 0;

			const $parentNodeWidth = getElSize($wrapper, isVertical);

			let $childrenEl = Array.from($marqueeInner.children);

			if (!$childrenEl.length) return;

			if (!cacheArray.length) {
				cacheArray = $childrenEl.map(($item) => $item);
			} else {
				$childrenEl = [...cacheArray];
			}

			// Додаємо базові стилів флексів для коректного підрахунку розмірів елементів.
			$marqueeInner.style.display = 'flex';
			if (isVertical) $marqueeInner.style.flexDirection = 'column';
			// Обнуляємо кількість елементів щоб уникнути дублювання при зміні розмірів екрану.
			$marqueeInner.innerHTML = '';
			$childrenEl.forEach(($item) => {
				$marqueeInner.append($item);
			});

			// Перед дублюванням елементів додаємо стилі відступів та вносимо розміри елементів до динамічних данних.
			$childrenEl.forEach(($item) => {
				if (isVertical) {
					$item.style.marginBottom = `${spaceBetween}px`;
				} else {
					$item.style.marginRight = `${spaceBetween}px`;
					$item.style.flexShrink = 0;
				}

				const sizeEl = getElSize($item, isVertical);

				sumSize += sizeEl + spaceBetween;
				firstScreenVisibleSize += sizeEl + spaceBetween;
				initialSizeElements += sizeEl + spaceBetween;
				counterDuplicateElements += 1;

				return sizeEl;
			});

			const $multiplyWidth = $parentNodeWidth * 2 + initialSizeElements;

			// Дублюємо елементи за необхідності.
			for (; sumSize < $multiplyWidth; index += 1) {
				if (!$childrenEl[index]) index = 0;

				const $cloneNone = $childrenEl[index].cloneNode(true);
				const $lastElement = $marqueeInner.children[index];

				$marqueeInner.append($cloneNone);

				sumSize += getElSize($lastElement, isVertical) + spaceBetween;

				if (
					firstScreenVisibleSize < $parentNodeWidth ||
					counterDuplicateElements % initialElementsLength !== 0
				) {
					counterDuplicateElements += 1;
					firstScreenVisibleSize += getElSize($lastElement, isVertical) + spaceBetween;
				}
			}

			// Додаємо базові стилі враховуючи обчислені значення ширин елементів.
			setBaseStyles(firstScreenVisibleSize);
		};

		// Функція коректного визначення відступів між елементами (якщо відступи додані в CSS).
		const correctSpaceBetween = () => {
			if (spaceBetweenItem) {
				$items.forEach(($item) => $item.style.removeProperty('margin-right'));

				spaceBetweenItem = parseFloat(window.getComputedStyle($items[0]).getPropertyValue('margin-right'));
				spaceBetween = spaceBetweenItem ? spaceBetweenItem : !isNaN(dataMarqueeSpace) ? dataMarqueeSpace : 30;
			}
		};

		// Функція ініціалізації.
		const init = () => {
			correctSpaceBetween();
			addDublicateElements();
			animation();
			initEvents();
		};

		// Функція перезапуску анімації при зміні розмірів вьюпорта.
		const onResize = () => {
			head.querySelector(`.${animName}`)?.remove();
			init();
		};

		// Функція паузи при наведенні миші.
		const onChangePaused = (e) => {
			const { type, target } = e;

			target.style.animationPlayState = type === 'mouseenter' ? 'paused' : 'running';
		};
		onWindowWidthResize(onResize);
	});
}
marquee()