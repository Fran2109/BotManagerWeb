import { BotInput } from '../types';

export const getBotInput = (taskName: string, username: string): BotInput => {
  switch (taskName) {
    case "RPA002 - Main - Actualizar Estados":
      switch (username) {
        case "franciscofilosi1@gmail.com":
        case "franciscofilosi4@gmail.com":
          return {
            boolean_apagarAlFinalizar: {
              type: "BOOLEAN",
              boolean: true,
            },
          };
        default:
          return {};
      }
    case "RPA003 - Main - Nombres":
    case "RPA004 - Main - Status":
    case "RPA005 - Main - Backup":
    case "RPA010 - Main - Eliminar":
    case "RPA015 - Main - Migrar Uno":
    case "RPA017 - Main - Copiar":
    case "RPA018 - Main - MCU":
    case "RPA020 - Main - Vender Facebook":
      return {};
    case "RPA012 - Main - Procesar":
      return {
        number_cantOfFolders: {
          type: "NUMBER",
          number: 0,
        },
        boolean_apagarAlFinalizar: {
          type: "BOOLEAN",
          boolean: true,
        }
      };
    case "RPA013 - Main - Migration":
      return {
        boolean_apagarAlFinalizar: {
          type: "BOOLEAN",
          boolean: true,
        },
        boolean_origin: {
          type: "BOOLEAN",
          boolean: true,
        },
        boolean_destiny: {
          type: "BOOLEAN",
          boolean: true,
        },
      };
    case "RPA014 - Main - Liberar":
    case "RPA016 - Main - Proceso Completo":
      return {
        boolean_apagarAlFinalizar: {
          type: "BOOLEAN",
          boolean: true,
        },
      };
    case "Descargar":
      return {
        Cantidad: {
          type: "NUMBER",
          number: 2270,
        },
      };
    case "Shutdown Now":
    case "RPA019 - Main - Estado PC":
      return {};
    default:
      return {};
  }
};