import { Injectable } from "../annotation";
import { SecondaryMagicNumberService } from "./second";

/**
 * Used to test circular imports
 */
@Injectable([SecondaryMagicNumberService])
export class PrimaryMagicNumberService {
  getN(): number {
    return 5;
  }
}
