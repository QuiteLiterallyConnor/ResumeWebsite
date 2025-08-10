import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [], // ← empty; do NOT declare standalone components
  imports: [
    BrowserModule,
    AppRoutingModule,
    AppComponent       // ← import the standalone root component here
  ],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [AppComponent]
})
export class AppModule {}
