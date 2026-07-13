/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

#define STATE_WAIT_START 0
#define STATE_PLAYING    1
#define STATE_GAMEOVER   2

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

/* USER CODE BEGIN PV */

volatile uint8_t game_state = STATE_WAIT_START;
volatile int remaining_time = 60;
volatile uint8_t button_press_count = 0;
volatile uint32_t buzzer_timer = 0;
volatile uint8_t current_digit_index = 0;
volatile uint32_t toggle_counter = 0;

char secret_code[5] = "0000";
char input_buffer[5];
volatile uint8_t input_index = 0;

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
/* USER CODE BEGIN PFP */

void Delay(volatile uint32_t count);
void Generate_Random_Code(uint32_t seed);
void LCD_Enable(void);
void LCD_Command(uint8_t cmd);
void LCD_Data(uint8_t data);
void LCD_Init(void);
void LCD_Print(char *str);
void Seg7_Init(void);
void Update_7Seg_Ticks(int number);
void LED_Buzzer_Init(void);
void UART_Init(void);
void UART_SendChar(char c);
void UART_SendString(char *str);
void Check_Password(void);
void Button_Init(void);
void TIM2_Init(void);

/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  /* USER CODE BEGIN 2 */

    LCD_Init();
    Seg7_Init();
    LED_Buzzer_Init();
    UART_Init();
    Button_Init();
    TIM2_Init();

    LCD_Command(0x01);
    LCD_Print("Press S to Start");
    UART_SendString("\r\n--- Mastermind Game ---\r\nPress 'S' to Start\r\n");

  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE2);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_NONE;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_HSI;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV1;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_0) != HAL_OK)
  {
    Error_Handler();
  }
}

/* USER CODE BEGIN 4 */

void Delay(volatile uint32_t count) {
    while(count--) {}
}

void Generate_Random_Code(uint32_t seed) {
    uint32_t rand_num = seed;
    for (int i = 0; i < 4; i++) {
        rand_num = (rand_num * 1103515245 + 12345);
        uint8_t digit = (rand_num / 65536) % 10;
        secret_code[i] = '0' + digit;
    }
    secret_code[4] = '\0';
}

void LCD_Enable(void) {
    GPIOC->BSRR = (1 << 1);        /* Set PC1 (EN = 1) */
    Delay(200);
    GPIOC->BSRR = (1 << (1 + 16)); /* Reset PC1 (EN = 0) */
    Delay(200);
}

void LCD_Command(uint8_t cmd) {
    GPIOC->BSRR = (1 << (0 + 16)); /* Reset PC0 (RS = 0) */
    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | (((cmd >> 4) & 0x0F) << 2);
    LCD_Enable();
    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | ((cmd & 0x0F) << 2);
    LCD_Enable();
    Delay(500);
}

void LCD_Data(uint8_t data) {
    GPIOC->BSRR = (1 << 0);        /* Set PC0 (RS = 1) */
    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | (((data >> 4) & 0x0F) << 2);
    LCD_Enable();
    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | ((data & 0x0F) << 2);
    LCD_Enable();
    Delay(500);
}

void LCD_Init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOCEN;
    GPIOC->MODER &= ~(0x00000FFF);
    GPIOC->MODER |=  0x00000555;
    Delay(10000);

    GPIOC->BSRR = (1 << (0 + 16));
    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | (0x03 << 2);
    LCD_Enable(); Delay(2000);
    LCD_Enable(); Delay(500);
    LCD_Enable(); Delay(500);

    GPIOC->ODR = (GPIOC->ODR & ~(0x3C)) | (0x02 << 2);
    LCD_Enable(); Delay(500);

    LCD_Command(0x28);
    LCD_Command(0x0C);
    LCD_Command(0x01);
    Delay(2000);
}

void LCD_Print(char *str) {
    while (*str) LCD_Data(*str++);
}

void Seg7_Init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOBEN | RCC_AHB1ENR_GPIOEEN;
    GPIOB->MODER &= ~(0x033F0000);
    GPIOB->MODER |=  0x01150000;
    GPIOE->MODER &= ~(0xFFFC0000);
    GPIOE->MODER |=  0x55540000;
}

void Update_7Seg_Ticks(int number) {
    if (number < 0) number = 0;
    uint8_t digits[4];
    digits[0] = number / 1000;
    digits[1] = (number / 100) % 10;
    digits[2] = (number / 10) % 10;
    digits[3] = number % 10;

    uint16_t digit_pins[4] = {12, 10, 9, 8};
    uint8_t seg_code[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F};

    GPIOB->BSRR = (1 << 12) | (1 << 10) | (1 << 9) | (1 << 8);
    GPIOE->BSRR = (0x7F << (9 + 16));

    GPIOE->BSRR = (seg_code[digits[current_digit_index]] << 9);
    GPIOB->BSRR = (1 << (digit_pins[current_digit_index] + 16));

    current_digit_index = (current_digit_index + 1) % 4;
}

void LED_Buzzer_Init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIODEN;
    GPIOD->MODER &= ~(0x0FC00000);
    GPIOD->MODER |=  0x05400000;
}

void UART_Init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    GPIOA->MODER &= ~(0x003C0000);
    GPIOA->MODER |=  0x00280000;
    GPIOA->AFR[1] &= ~(0x00000FF0);
    GPIOA->AFR[1] |=  0x00000770;
    USART1->BRR = 0x0683;
    USART1->CR1 = USART_CR1_TE | USART_CR1_RE | USART_CR1_RXNEIE | USART_CR1_UE;
    NVIC_EnableIRQ(USART1_IRQn);
}

void UART_SendChar(char c) {
    while (!(USART1->SR & USART_SR_TXE));
    USART1->DR = c;
}

void UART_SendString(char *str) {
    while (*str) {
        UART_SendChar(*str++);
    }
}

void Check_Password(void) {
    char feedback[5] = "----";
    int secret_used[4] = {0};
    int input_used[4] = {0};

    for (int i = 0; i < 4; i++) {
        if (input_buffer[i] == secret_code[i]) {
            feedback[i] = '*';
            secret_used[i] = 1;
            input_used[i] = 1;
        }
    }
    for (int i = 0; i < 4; i++) {
        if (!input_used[i]) {
            for (int j = 0; j < 4; j++) {
                if (!secret_used[j] && input_buffer[i] == secret_code[j]) {
                    feedback[i] = '+';secret_used[j] = 1;
                    break;
                }
            }
        }
    }

    if (feedback[0] == '*' && feedback[1] == '*' && feedback[2] == '*' && feedback[3] == '*') {
        game_state = STATE_GAMEOVER;
        LCD_Command(0x01);
        LCD_Print("YOU WON");
        UART_SendString("\r\n*** YOU WON ***\r\nPress 'S' to Restart.\r\n");
    } else {
        LCD_Command(0x01);
        LCD_Print("[");
        LCD_Print(feedback);
        LCD_Print("]");
        UART_SendString("\r\nFeedback: [");
        UART_SendString(feedback);
        UART_SendString("]\r\nEnter 4 digits: ");
    }
}

void Button_Init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOEEN;
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;

    GPIOE->MODER &= ~(0x00000003);

    GPIOE->PUPDR &= ~(0x00000003);
    GPIOE->PUPDR |=  (0x00000001);

    SYSCFG->EXTICR[0] &= ~(0x0000000F);
    SYSCFG->EXTICR[0] |=  (0x00000004);

    EXTI->IMR |= (1 << 0);
    EXTI->FTSR |= (1 << 0);
    EXTI->RTSR &= ~(1 << 0);

    EXTI->PR = (1 << 0);

    NVIC_SetPriority(EXTI0_IRQn, 0);
    NVIC_EnableIRQ(EXTI0_IRQn);
}

void TIM2_Init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    TIM2->PSC = 16 - 1;
    TIM2->ARR = 10000 - 1;
    TIM2->DIER |= TIM_DIER_UIE;
    TIM2->CR1 |= TIM_CR1_CEN;
    NVIC_SetPriority(TIM2_IRQn, 1);
    NVIC_EnableIRQ(TIM2_IRQn);
}

void USART1_IRQHandler(void) {
    if (USART1->SR & USART_SR_RXNE) {
        char rx_data = USART1->DR;

        if (game_state == STATE_WAIT_START || game_state == STATE_GAMEOVER) {
            if (rx_data == 'S' || rx_data == 's') {
                Generate_Random_Code(TIM2->CNT);

                game_state = STATE_PLAYING;
                remaining_time = 60;
                button_press_count = 0;
                input_index = 0;
                GPIOD->BSRR = (1 << 12) | (1 << 13);
                GPIOD->BSRR = (1 << (11 + 16));
                LCD_Command(0x01);
                LCD_Print("Game Started!");
                UART_SendString("\r\nGame Started!\r\nEnter 4 digits: ");
            }
        }
        else if (game_state == STATE_PLAYING) {
            if (rx_data == '\r' || rx_data == '\n') {
                if (input_index == 4) {
                    input_buffer[4] = '\0';
                    Check_Password();
                } else {
                    UART_SendString("\r\nError: Must be 4 digits!\r\nEnter 4 digits: ");
                }
                input_index = 0;
            }
            else if (rx_data >= '0' && rx_data <= '9') {
                if (input_index < 4) {
                    UART_SendChar(rx_data);
                    input_buffer[input_index++] = rx_data;
                }
            }
        }
    }
}

void EXTI0_IRQHandler(void) {
    if (EXTI->PR & (1 << 0)) {
        static uint32_t last_press_tick = 0;
        if (game_state == STATE_PLAYING && (remaining_time != last_press_tick)) {
            last_press_tick = remaining_time;

            if (button_press_count == 0) {
                remaining_time += 15;
                button_press_count = 1;
                GPIOD->BSRR = (1 << (12 + 16));
            } else if (button_press_count == 1) {
                remaining_time += 5;
                button_press_count = 2;
                GPIOD->BSRR = (1 << (13 + 16));
            }
        }
        EXTI->PR = (1 << 0);
    }
}

void TIM2_IRQHandler(void) {
    static uint32_t ms_counter = 0;
    if (TIM2->SR & TIM_SR_UIF) {
        TIM2->SR &= ~TIM_SR_UIF;

        if (game_state == STATE_PLAYING) {
            Update_7Seg_Ticks(remaining_time);
        } else {
            Update_7Seg_Ticks(0);}

        if (game_state == STATE_GAMEOVER && buzzer_timer > 0) {
            toggle_counter++;
            if (toggle_counter >= 2) {
                toggle_counter = 0;
                GPIOD->ODR ^= (1 << 11);
            }
        }

        ms_counter++;
        if (ms_counter >= 27) {
            ms_counter = 0;
            if (game_state == STATE_PLAYING) {
                if (remaining_time > 0) {
                    remaining_time--;
                } else {
                    game_state = STATE_GAMEOVER;
                    buzzer_timer = 3;
                    LCD_Command(0x01);
                    LCD_Print("BOOM");
                    UART_SendString("\r\nBOOM! Time is Up.\r\nPress 'S' to Restart.\r\n");
                }
            }
            else if (game_state == STATE_GAMEOVER && buzzer_timer > 0) {
                buzzer_timer--;
                if (buzzer_timer == 0) {
                    GPIOD->BSRR = (1 << (11 + 16));
                }
            }
        }
    }
}

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
