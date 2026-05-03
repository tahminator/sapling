import { Injectable } from "../annotation";
import { PrimaryMagicNumberService } from "./first";

/**
 * Used to test circular imports
 */
@Injectable([PrimaryMagicNumberService])
export class SecondaryMagicNumberService {
  getN(): number {
    return 4;
  }
}
