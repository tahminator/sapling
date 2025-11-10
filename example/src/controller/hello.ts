import { Controller, GET, ResponseEntity } from "@tahminator/sapling";

@Controller({
  prefix: "/api",
})
export class HelloWorldController {
  @GET()
  getHelloWorld(): ResponseEntity<string> {
    return ResponseEntity.ok().body("HELLO WORLD");
  }
}
