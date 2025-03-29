					<div class="flex items-center gap-3 mb-4">
						<div class="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
							<Crown size={24} class="text-primary" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">{PRICING_TIER.name}</h2>
							<p class="text-muted-foreground text-sm">{PRICING_TIER.description}</p>
						</div>
					</div>
					
					<ul class="space-y-3 my-6">
						{#each PRICING_TIER.features as feature}
							<li class="flex items-center gap-2 text-sm text-left">
								<span class="text-primary">✓</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
					
					<div class="text mb-6 text-left">					
						<h2 class="text-2xl font-bold mb-2">
							{#if isInTrial}
								Free Trial <span class="">Active</span>
							{:else}
								Premium Subscription Active
							{/if} 
						</h2>
						<p class="text-indigo-200 mb-2">You have access to all premium features!</p>
						
						{#if planName !== 'Free Trial' && planName != null}
							<p class="text-sm text-primary">Plan: {planName}</p>
						{/if}
						
						{#if currentPeriodEnd && !isInTrial}
							<p class="text-sm text-primary mb-4">Current period ends: {currentPeriodEnd}</p>
						{/if}
						
						{#if isInTrial && trialEnd}
							<!-- Enhanced trial information -->
							<div class="mt-6 mb-6 w-full max-w-lg">
								<div class="my-2 flex flex-col items-start gap-6">
									<TrialBadge trialEndDate={data.subscriptionStatus?.trialEnd || ''} variant="large" />
									<Button onclick={openBillingDialog} class="flex items-center gap-2">
										<CreditCard class="h-4 w-4" />
										Choose Plan
									</Button>
								</div>
							</div>
							
							<!-- Dialog for billing plan selection and continue -->
							<Dialog bind:open={isDialogOpen}>
								<DialogContent class="sm:max-w-[550px] p-0 overflow-hidden bg-gradient-to-br from-background to-background/95 border-primary/20">
									<div class="relative">
										<!-- Decorative elements -->
										<div class="absolute -top-16 -right-16 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
										<div class="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
										
										<DialogHeader class="p-6 border-b border-border/30">
											<div class="flex items-center gap-3 mb-2">
												<div class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
													<Crown size={20} class="text-primary" />
												</div>
												<DialogTitle class="text-2xl font-bold text-foreground">Choose Your Plan</DialogTitle>
											</div>
											<DialogDescription class="text-base text-muted-foreground">
												Select your preferred billing period to continue after your trial ends.
											</DialogDescription>
										</DialogHeader>
										
										<!-- Plan selection cards -->
										<div class="p-6">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
												<!-- Monthly plan card -->
												<div 
													class="p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md {billingPeriod === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"
													onclick={() => billingPeriod = 'monthly'}
												>
													<div class="flex justify-between items-start">
														<div>
															<h3 class="font-semibold text-lg mb-1">Monthly</h3>
															<p class="text-sm text-muted-foreground">Flexible month-to-month</p>
														</div>
														<div class="w-5 h-5 rounded-full border-2 {billingPeriod === 'monthly' ? 'bg-primary border-primary' : 'border-muted-foreground'} flex items-center justify-center">
															{#if billingPeriod === 'monthly'}
																<CheckCircle class="h-4 w-4 text-white" />
															{/if}
														</div>
													</div>
													<div class="mt-4">
														<span class="text-2xl font-bold">${currentOption.price}</span>
														<span class="text-muted-foreground text-sm">/month</span>
													</div>
												</div>
												
												<!-- Yearly plan card -->
												<div 
													class="p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md {billingPeriod === 'yearly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"
													onclick={() => billingPeriod = 'yearly'}
												>
													<div class="flex justify-between items-start">
														<div>
															<div class="flex items-center gap-2">
																<h3 class="font-semibold text-lg mb-1">Yearly</h3>
																{#if PRICING_TIER.options.length > 1 && PRICING_TIER.options[1]?.savingsAmount && PRICING_TIER.options[1].savingsAmount > 0}
																	<span class="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
																		Best value
																	</span>
																{/if}
															</div>
															<p class="text-sm text-muted-foreground">Save with annual billing</p>
														</div>
														<div class="w-5 h-5 rounded-full border-2 {billingPeriod === 'yearly' ? 'bg-primary border-primary' : 'border-muted-foreground'} flex items-center justify-center">
															{#if billingPeriod === 'yearly'}
																<CheckCircle class="h-4 w-4 text-white" />
															{/if}
														</div>
													</div>
													<div class="mt-4">
														<span class="text-2xl font-bold">${PRICING_TIER.options.find(option => option.period === 'yearly')?.price || 0}</span>
														<span class="text-muted-foreground text-sm">/year</span>
														{#if PRICING_TIER.options.length > 1 && PRICING_TIER.options[1]?.savingsAmount && PRICING_TIER.options[1].savingsAmount > 0}
															<span class="ml-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
																Save ${PRICING_TIER.options[1].savingsAmount}
															</span>
														{/if}
													</div>
												</div>
											</div>
											
											<!-- Summary of what's included -->
											<div class="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
												<h4 class="font-medium mb-3 flex items-center gap-2">
													<CheckCircle class="h-4 w-4 text-primary" />
													<span>What's included:</span>
												</h4>
												<ul class="space-y-2">
													{#each PRICING_TIER.features.slice(0, 3) as feature}
														<li class="flex items-center gap-2 text-sm">
															<span class="text-primary">✓</span>
															<span>{feature}</span>
														</li>
													{/each}
													{#if PRICING_TIER.features.length > 3}
														<li class="text-sm text-primary hover:underline cursor-pointer">
															+ {PRICING_TIER.features.length - 3} more features
														</li>
													{/if}
												</ul>
											</div>
										</div>
										
										<DialogFooter class="p-6 border-t border-border/30 bg-muted/20 flex flex-col sm:flex-row sm:justify-between gap-3">
											<Button 
												variant="outline" 
												onclick={handleContinue}
												class="flex items-center justify-center gap-2 order-2 sm:order-1"
											>
												Continue with Trial
												<ArrowRight size={16} />
											</Button>
											
											<Button 
												onclick={handleSubscribe}
												class="button-gradient order-1 sm:order-2" 
												disabled={isLoading}
											>
												{isLoading ? 'Processing...' : `Subscribe ${billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}`}
											</Button>
										</DialogFooter>
									</div>
								</DialogContent>
							</Dialog>
						{/if}
					</div>
					
					<div class="flex flex-col sm:flex-row gap-4">
						<div class="mt-4 py-2 px-3 {isInTrial ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'} border rounded-lg text-sm text-left">
							{#if isInTrial}
								<span class="font-semibold text-primary">Your free trial ends on {trialEnd}</span><br>
								${currentOption.price}/{billingPeriod === 'monthly' ? 'month' : 'year'} after trial
							{:else}
								${currentOption.price}/{billingPeriod === 'monthly' ? 'month' : 'year'}
							{/if}
						</div>
					</div> 