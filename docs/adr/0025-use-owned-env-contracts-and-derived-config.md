# Use Owned Env Contracts And Derived Config

Megiddo will use T3 Env to define declarative Env Contracts owned by each service or script instead of one global runtime env object. Service and Script Config objects may derive convenient values from those contracts, but application or script wiring remains responsible for deciding behavior. Cross-component collation is an Env Catalog concern for documentation and checks, not a runtime import surface.
